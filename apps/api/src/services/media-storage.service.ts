import { createReadStream } from "node:fs"
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { randomUUID } from "node:crypto"

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { StorageProvider, StoragePurpose } from "@workspace/core/enums"
import { MediaModel, StorageModel } from "@workspace/db/models"
import {
  getMediaRule,
  outputExtension,
  processImageBuffer,
  type MediaPurpose,
  type MediaUploadResult,
} from "@workspace/media/server"

import { decryptStorageCredential } from "./storage-credentials.service"

type StoredStorage = Record<string, any>

export async function storeMediaFile({
  filePath,
  mimeType,
  purpose,
  preferredStorageId,
  imageMode,
  keySlug,
  createdBy,
  originalName,
  sourceUrl,
}: {
  filePath: string
  mimeType: string
  purpose: MediaPurpose
  preferredStorageId?: string
  imageMode?: "crop" | "fit"
  keySlug?: string
  createdBy: string
  originalName?: string
  sourceUrl?: string
}) {
  const rule = getMediaRule(purpose)
  const source = await stat(filePath)
  if (source.size > rule.maxBytes)
    throw httpError(
      413,
      `File exceeds the ${formatBytes(rule.maxBytes)} limit for ${purpose}`
    )

  let body: Buffer | undefined
  let outputMimeType = mimeType
  let width: number | undefined
  let height: number | undefined
  if (rule.kind === "image") {
    const processed = await processImageBuffer(
      await readFile(filePath),
      purpose,
      { mode: imageMode }
    )
    body = processed.buffer
    outputMimeType = processed.mimeType
    width = processed.width
    height = processed.height
  }

  const storage = await selectStorage(purpose, preferredStorageId)
  const id = randomUUID()
  const extension = outputExtension(purpose, outputMimeType)
  const now = new Date()
  const datePath = [
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("-")
  const fileSlug = normalizeKeySlug(keySlug) || id
  const key = `${datePath}/${fileSlug}.${extension}`
  const size = body?.byteLength ?? source.size
  const url = mediaPublicUrl(storage, key)
  const mediaRecord = await MediaModel.create({
    _id: id,
    kind: rule.kind,
    purpose,
    provider: storage.provider,
    status: "processing",
    storageId: storage._id,
    sourceUrl,
    url,
    key,
    originalName,
    mimeType: outputMimeType,
    size,
    width,
    height,
    createdBy,
  })

  try {
    if (storage.provider === StorageProvider.LOCAL) {
      const basePath = storage.local?.basePath
      if (!basePath) throw new Error("Local storage path is not configured")
      const destination = safeLocalPath(basePath, key)
      await mkdir(path.dirname(destination), { recursive: true })
      if (body) await writeFile(destination, body)
      else await copyFile(filePath, destination)
    } else {
      const client = createS3Client(storage)
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: storage.s3.bucket,
            Key: withPrefix(storage.s3.prefix, key),
            Body: body ?? createReadStream(filePath),
            ContentType: outputMimeType,
            ContentLength: size,
          })
        )
      } finally {
        client.destroy()
      }
    }
    mediaRecord.status = "ready"
    await mediaRecord.save()
  } catch (error) {
    mediaRecord.status = "failed"
    mediaRecord.error = error instanceof Error ? error.message : "Upload failed"
    await mediaRecord.save().catch(() => undefined)
    throw error
  }

  return {
    id,
    url,
    key,
    storageId: storage._id,
    provider: storage.provider,
    status: "ready",
    purpose,
    kind: rule.kind,
    mimeType: outputMimeType,
    size,
    width,
    height,
  } satisfies MediaUploadResult
}

export async function openStoredMedia(
  storageId: string,
  key: string,
  range?: { start: number; end?: number }
) {
  const storage = (await StorageModel.findById(storageId)
    .select("+s3.accessKeyIdEncrypted +s3.secretAccessKeyEncrypted")
    .lean()) as StoredStorage | null
  if (!storage) throw httpError(404, "Storage not found")

  if (storage.provider === StorageProvider.LOCAL) {
    const filePath = safeLocalPath(storage.local?.basePath, key)
    const details = await stat(filePath).catch(() => null)
    if (!details?.isFile()) throw httpError(404, "Media not found")
    const end =
      range?.end === undefined
        ? details.size - 1
        : Math.min(range.end, details.size - 1)
    if (
      range &&
      (range.start < 0 || range.start >= details.size || end < range.start)
    )
      throw httpError(416, "Requested range is not satisfiable")
    return {
      body: createReadStream(
        filePath,
        range ? { start: range.start, end } : undefined
      ),
      size: range ? end - range.start + 1 : details.size,
      contentRange: range
        ? `bytes ${range.start}-${end}/${details.size}`
        : undefined,
      mimeType: mimeTypeFromKey(key),
    }
  }

  const client = createS3Client(storage)
  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: storage.s3.bucket,
        Key: withPrefix(storage.s3.prefix, key),
        Range: range ? `bytes=${range.start}-${range.end ?? ""}` : undefined,
      })
    )
    if (!result.Body) throw httpError(404, "Media not found")
    const body = result.Body as unknown as {
      pipe?: (destination: NodeJS.WritableStream) => unknown
      transformToWebStream?: () => ReadableStream
    }
    const stream: Readable = body.pipe
      ? (body as unknown as Readable)
      : Readable.fromWeb(body.transformToWebStream!() as any)
    return {
      body: stream,
      size: result.ContentLength,
      contentRange: result.ContentRange,
      mimeType: result.ContentType ?? mimeTypeFromKey(key),
      client,
    }
  } catch (error) {
    client.destroy()
    throw error
  }
}

async function selectStorage(
  purpose: MediaPurpose,
  preferredStorageId?: string
) {
  const storagePurposes =
    getMediaRule(purpose).kind === "image"
      ? purpose === "avatar"
        ? [StoragePurpose.IMAGES, StoragePurpose.UPLOADS]
        : [
            StoragePurpose.THUMBNAILS,
            StoragePurpose.IMAGES,
            StoragePurpose.UPLOADS,
          ]
      : [StoragePurpose.VIDEOS, StoragePurpose.UPLOADS]
  const filter: Record<string, unknown> = {
    enabled: true,
    deletedAt: null,
    purposes: { $in: storagePurposes },
  }
  if (preferredStorageId) filter._id = preferredStorageId
  const storage = (await StorageModel.findOne(filter)
    .sort({ priority: 1, createdAt: 1 })
    .select("+s3.accessKeyIdEncrypted +s3.secretAccessKeyEncrypted")
    .lean()) as StoredStorage | null
  if (!storage)
    throw httpError(
      409,
      `No enabled storage supports ${storagePurposes.join(" or ")}`
    )
  return storage
}

function createS3Client(storage: StoredStorage) {
  const s3 = storage.s3
  if (
    !s3?.bucket ||
    !s3.region ||
    !s3.accessKeyIdEncrypted ||
    !s3.secretAccessKeyEncrypted
  )
    throw new Error("S3 configuration is incomplete")
  return new S3Client({
    region: s3.region,
    endpoint: s3.endpoint || undefined,
    forcePathStyle: s3.forcePathStyle ?? false,
    credentials: {
      accessKeyId: decryptStorageCredential(s3.accessKeyIdEncrypted),
      secretAccessKey: decryptStorageCredential(s3.secretAccessKeyEncrypted),
    },
  })
}

function mediaPublicUrl(storage: StoredStorage, key: string) {
  if (storage.publicUrl) {
    const publicKey =
      storage.provider === StorageProvider.S3
        ? withPrefix(storage.s3?.prefix, key)
        : key
    return `${String(storage.publicUrl).replace(/\/$/, "")}/${publicKey}`
  }
  return `/api/v1/media/files/${encodeURIComponent(storage._id)}/${key.split("/").map(encodeURIComponent).join("/")}`
}

function withPrefix(prefix: string | undefined, key: string) {
  return [prefix?.replace(/^\/+|\/+$/g, ""), key].filter(Boolean).join("/")
}

function normalizeKeySlug(value?: string) {
  return value
    ?.normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
}

function safeLocalPath(basePath: string | undefined, key: string) {
  if (!basePath) throw new Error("Local storage path is not configured")
  const base = path.resolve(basePath)
  const destination = path.resolve(base, ...key.split("/"))
  if (destination !== base && !destination.startsWith(`${base}${path.sep}`))
    throw httpError(400, "Invalid media path")
  return destination
}

function mimeTypeFromKey(key: string) {
  const extension = path.extname(key).toLowerCase()
  return (
    (
      {
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".avif": "image/avif",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".m3u8": "application/vnd.apple.mpegurl",
      } as Record<string, string>
    )[extension] ?? "application/octet-stream"
  )
}

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status })
}

function formatBytes(value: number) {
  return value >= 1024 ** 3
    ? `${Math.round(value / 1024 ** 3)}GB`
    : `${Math.round(value / 1024 ** 2)}MB`
}
