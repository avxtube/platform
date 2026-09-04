import { createReadStream, createWriteStream, mkdirSync } from "node:fs"
import { readFile, stat, unlink } from "node:fs/promises"
import { isIP } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import { lookup } from "node:dns/promises"
import { randomUUID } from "node:crypto"

import { fileTypeFromFile } from "file-type"
import {
  extensionForMimeType,
  getMediaRule,
  isMediaPurpose,
  validateMediaType,
  type MediaPurpose,
} from "@workspace/media"
import { processImageBuffer } from "@workspace/media/server"
import { Router, type NextFunction, type Request, type Response } from "express"
import multer from "multer"

import {
  authenticateUser,
  getRequestActor,
  requireAdmin,
} from "../middlewares/user-access.middleware"
import { storeMediaFile } from "../services/media-storage.service"
import { importVideoToVdoHide } from "../services/vdohide-import.service"
import { registerMissavMedia } from "../services/remote-media-import.service"

const uploadDirectory = path.join(tmpdir(), "avxtube-media")
mkdirSync(uploadDirectory, { recursive: true })
const upload = multer({
  dest: uploadDirectory,
  limits: { files: 1, fileSize: 10 * 1024 ** 3 },
})
const router: Router = Router()
router.use(authenticateUser, requireAdmin)

router.post(
  "/register-missav",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mediaIds = await registerMissavMedia(
        req.body,
        getRequestActor(res).id
      )
      res.status(201).json({ mediaIds })
    } catch (error) {
      next(error)
    }
  }
)

router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    const temporaryFile = req.file?.path
    try {
      if (!req.file || !temporaryFile) throw httpError(400, "file is required")
      const purpose = parsePurpose(req.body.purpose)
      const actor = getRequestActor(res)
      const imageMode = parseImageMode(req.body.imageMode)
      const mimeType = await detectMimeType(temporaryFile, req.file.mimetype)
      validateFile(purpose, mimeType, req.file.size)
      const media = await storeMediaFile({
        filePath: temporaryFile,
        mimeType,
        purpose,
        preferredStorageId: optionalString(req.body.storageId),
        imageMode,
        keySlug: optionalString(req.body.keySlug),
        createdBy: actor.id,
        originalName: req.file.originalname,
      })
      res.status(201).json({ media })
    } catch (error) {
      next(error)
    } finally {
      if (temporaryFile) await unlink(temporaryFile).catch(() => undefined)
    }
  }
)

router.post(
  "/import-vdohide",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const purpose = parsePurpose(req.body?.purpose)
      const sourceUrl = requiredHttpUrl(req.body?.url)
      const fallbackUrl = optionalHttpUrl(req.body?.fallbackUrl)
      const actor = getRequestActor(res)
      const media = await importVideoToVdoHide({
        purpose,
        sourceUrl: sourceUrl.toString(),
        fallbackUrl: fallbackUrl?.toString(),
        createdBy: actor.id,
        cookie: req.headers.cookie,
        authorization: req.headers.authorization,
      })
      res.status(202).json({ media })
    } catch (error) {
      next(error)
    }
  }
)

router.post(
  "/prepare-url",
  async (req: Request, res: Response, next: NextFunction) => {
    const temporaryFile = path.join(uploadDirectory, randomUUID())
    try {
      const purpose = parsePurpose(req.body?.purpose)
      const sourceUrl = requiredHttpUrl(req.body?.url)
      const referrerUrl = optionalHttpUrl(req.body?.referrerUrl)
      const rule = getMediaRule(purpose)
      const declaredMimeType = await downloadRemoteFile(
        sourceUrl,
        temporaryFile,
        rule.maxBytes,
        referrerUrl
      )
      const details = await fileTypeFromFile(temporaryFile)
      const mimeType = details?.mime ?? declaredMimeType
      const fileSize = (await stat(temporaryFile)).size
      validateFile(purpose, mimeType, fileSize)

      if (rule.kind === "video") {
        res.status(200).set({
          "content-type": mimeType,
          "content-length": String(fileSize),
          "cache-control": "no-store",
          "x-media-filename": `imported-${randomUUID()}.${extensionForMimeType(mimeType)}`,
        })
        await pipeline(createReadStream(temporaryFile), res)
        return
      }

      const input = await readFile(temporaryFile)
      const prepared = await processImageBuffer(input, purpose, { mode: "fit" })

      res
        .status(200)
        .set({
          "content-type": prepared.mimeType,
          "content-length": String(prepared.buffer.byteLength),
          "cache-control": "no-store",
          "x-media-width": String(prepared.width),
          "x-media-height": String(prepared.height),
          "x-media-filename": `imported-${randomUUID()}.webp`,
        })
        .send(prepared.buffer)
    } catch (error) {
      next(error)
    } finally {
      await unlink(temporaryFile).catch(() => undefined)
    }
  }
)

router.post(
  "/import-url",
  async (req: Request, res: Response, next: NextFunction) => {
    const temporaryFile = path.join(uploadDirectory, randomUUID())
    try {
      const purpose = parsePurpose(req.body?.purpose)
      const actor = getRequestActor(res)
      const imageMode = parseImageMode(req.body?.imageMode)
      const sourceUrl = requiredHttpUrl(req.body?.url)
      const referrerUrl = optionalHttpUrl(req.body?.referrerUrl)
      const keySlug = optionalString(req.body?.keySlug)
      const rule = getMediaRule(purpose)
      const mimeType = await downloadRemoteFile(
        sourceUrl,
        temporaryFile,
        rule.maxBytes,
        referrerUrl
      )
      const details = await fileTypeFromFile(temporaryFile)
      const resolvedMimeType = details?.mime ?? mimeType
      const size = (await import("node:fs/promises"))
        .stat(temporaryFile)
        .then((value) => value.size)
      validateFile(purpose, resolvedMimeType, await size)
      const media = await storeMediaFile({
        filePath: temporaryFile,
        mimeType: resolvedMimeType,
        purpose,
        preferredStorageId: optionalString(req.body?.storageId),
        imageMode,
        keySlug,
        createdBy: actor.id,
        sourceUrl: sourceUrl.toString(),
      })
      res.status(201).json({ media, sourceUrl })
    } catch (error) {
      next(error)
    } finally {
      await unlink(temporaryFile).catch(() => undefined)
    }
  }
)

async function downloadRemoteFile(
  initialUrl: URL,
  destination: string,
  maxBytes: number,
  referrerUrl?: URL
) {
  let url = initialUrl
  for (let redirect = 0; redirect <= 4; redirect += 1) {
    await assertPublicDestination(url)
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10 * 60_000),
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,video/*,*/*;q=0.8",
        referer: resolveRemoteReferrer(url, referrerUrl),
        "user-agent": "Mozilla/5.0 (compatible; AVXTUBE-Media-Importer/1.0)",
      },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location)
        throw httpError(400, "Remote server returned an invalid redirect")
      url = new URL(location, url)
      continue
    }
    if (!response.ok || !response.body)
      throw httpError(400, `Remote server returned ${response.status}`)
    const declaredSize = Number(response.headers.get("content-length") ?? 0)
    if (declaredSize > maxBytes)
      throw httpError(413, "Remote file is too large")
    let received = 0
    const limiter = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length
        callback(
          received > maxBytes
            ? httpError(413, "Remote file is too large")
            : null,
          chunk
        )
      },
    })
    await pipeline(
      Readable.fromWeb(response.body as any),
      limiter,
      createWriteStream(destination, { flags: "wx" })
    )
    return normalizeMimeType(response.headers.get("content-type") ?? "")
  }
  throw httpError(400, "Remote URL redirected too many times")
}

function resolveRemoteReferrer(url: URL, requestedReferrer?: URL) {
  if (requestedReferrer) return `${requestedReferrer.origin}/`
  const hostname = url.hostname.toLowerCase()
  if (hostname === "fourhoi.com" || hostname.endsWith(".fourhoi.com"))
    return "https://missav.ai/"
  return `${url.origin}/`
}

async function assertPublicDestination(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw httpError(400, "Only HTTP(S) URLs are allowed")
  if (url.username || url.password)
    throw httpError(400, "URL credentials are not allowed")
  if (url.port && url.port !== "80" && url.port !== "443")
    throw httpError(400, "Only ports 80 and 443 are allowed")
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true })
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateAddress(address))
  )
    throw httpError(400, "Private or local network URLs are not allowed")
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase()
  if (normalized.startsWith("::ffff:"))
    return isPrivateAddress(normalized.slice(7))
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  )
    return true
  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(normalized)
  if (!match) return false
  const [a, b] = [Number(match[1]), Number(match[2])]
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

async function detectMimeType(filePath: string, fallback: string) {
  return (await fileTypeFromFile(filePath))?.mime ?? normalizeMimeType(fallback)
}

function validateFile(purpose: MediaPurpose, mimeType: string, size: number) {
  const rule = getMediaRule(purpose)
  if (!validateMediaType(purpose, mimeType))
    throw httpError(
      415,
      `Unsupported ${purpose} media type: ${mimeType || "unknown"}`
    )
  if (size > rule.maxBytes)
    throw httpError(413, `${purpose} exceeds its upload limit`)
}

function parsePurpose(value: unknown) {
  if (!isMediaPurpose(value)) throw httpError(400, "purpose is invalid")
  return value
}

function parseImageMode(value: unknown): "crop" | "fit" | undefined {
  if (value === undefined || value === "") return undefined
  if (value !== "crop" && value !== "fit")
    throw httpError(400, "imageMode is invalid")
  return value
}

function requiredHttpUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2_000)
    throw httpError(400, "url is required")
  try {
    return new URL(value)
  } catch {
    throw httpError(400, "url is invalid")
  }
}

function optionalHttpUrl(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined
  return requiredHttpUrl(value)
}

function normalizeMimeType(value: string) {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? ""
}
function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}
function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status })
}

export default router
