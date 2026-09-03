import { constants as fsConstants } from "node:fs"
import { access, statfs } from "node:fs/promises"
import path from "node:path"

import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3"
import {
  StorageProvider,
  StoragePurpose,
  StorageStatus,
} from "@workspace/core/enums"
import { StorageModel } from "@workspace/db/models"
import { Router, type NextFunction, type Request, type Response } from "express"

import {
  authenticateUser,
  getRequestActor,
  requireAdmin,
} from "../middlewares/user-access.middleware"
import {
  decryptStorageCredential,
  encryptStorageCredential,
} from "../services/storage-credentials.service"

const router: Router = Router()
router.use(authenticateUser, requireAdmin)

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const storages = await StorageModel.find({ deletedAt: null })
      .sort({ priority: 1, createdAt: -1 })
      .lean()
    res.status(200).json({ storages: storages.map(toStorageResponse) })
  } catch (error) {
    next(error)
  }
})

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getRequestActor(res)
    const input = parseStorageInput(req.body)
    await ensureUniqueName(input.name)
    const storage = await StorageModel.create({
      ...buildStorageConfig(input),
      createdBy: actor.id,
      updatedBy: actor.id,
    })
    res.status(201).json({ storage: toStorageResponse(storage.toObject()) })
  } catch (error) {
    next(error)
  }
})

router.patch(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const actor = getRequestActor(res)
      const current = await StorageModel.findOne({
        _id: req.params.id,
        deletedAt: null,
      })
        .select("+s3.accessKeyIdEncrypted +s3.secretAccessKeyEncrypted")
        .lean()
      if (!current) {
        res.status(404).json({ error: "Storage not found" })
        return
      }

      const input = parseStorageInput(req.body)
      await ensureUniqueName(input.name, current._id)
      const config = buildStorageConfig(input, current)
      const storage = await StorageModel.findByIdAndUpdate(
        current._id,
        {
          $set: { ...config, updatedBy: actor.id },
          $unset:
            input.provider === StorageProvider.LOCAL
              ? { s3: 1, health: 1, capacity: 1 }
              : { local: 1, health: 1, capacity: 1 },
        },
        { new: true, runValidators: true }
      ).lean()
      res.status(200).json({ storage: toStorageResponse(storage!) })
    } catch (error) {
      next(error)
    }
  }
)

router.patch(
  "/:id/enabled",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!isRecord(req.body) || typeof req.body.enabled !== "boolean")
        throw badRequest("enabled must be a boolean")
      const actor = getRequestActor(res)
      const storage = await StorageModel.findOneAndUpdate(
        { _id: req.params.id, deletedAt: null },
        { $set: { enabled: req.body.enabled, updatedBy: actor.id } },
        { new: true, runValidators: true }
      ).lean()
      if (!storage) {
        res.status(404).json({ error: "Storage not found" })
        return
      }
      res.status(200).json({ storage: toStorageResponse(storage) })
    } catch (error) {
      next(error)
    }
  }
)

router.post(
  "/:id/test",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const storage = await StorageModel.findOne({
        _id: req.params.id,
        deletedAt: null,
      })
        .select("+s3.accessKeyIdEncrypted +s3.secretAccessKeyEncrypted")
        .lean()
      if (!storage) {
        res.status(404).json({ error: "Storage not found" })
        return
      }

      const startedAt = performance.now()
      let result: StorageTestResult
      try {
        result =
          storage.provider === StorageProvider.LOCAL
            ? await testLocalStorage(storage.local?.basePath)
            : await testS3Storage(storage.s3)
      } catch (error) {
        result = { ok: false, message: safeErrorMessage(error) }
      }
      const latencyMs = Math.max(0, Math.round(performance.now() - startedAt))
      const checkedAt = new Date()
      const status = result.ok ? StorageStatus.ONLINE : StorageStatus.ERROR
      await StorageModel.updateOne(
        { _id: storage._id },
        {
          $set: {
            status,
            health: { checkedAt, latencyMs, message: result.message },
            ...(result.capacity ? { capacity: result.capacity } : {}),
          },
          ...(!result.capacity ? { $unset: { capacity: 1 } } : {}),
        }
      )
      res.status(200).json({
        ok: result.ok,
        status,
        checkedAt,
        latencyMs,
        message: result.message,
        capacity: result.capacity,
      })
    } catch (error) {
      next(error)
    }
  }
)

router.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const actor = getRequestActor(res)
      const storage = await StorageModel.findOne({
        _id: req.params.id,
        deletedAt: null,
      }).lean()
      if (!storage) {
        res.status(404).json({ error: "Storage not found" })
        return
      }
      if (storage.enabled)
        throw badRequest("Disable the storage before deleting it")
      await StorageModel.updateOne(
        { _id: storage._id },
        { $set: { deletedAt: new Date(), updatedBy: actor.id } }
      )
      res.status(200).json({ deleted: true })
    } catch (error) {
      next(error)
    }
  }
)

type StorageInput = {
  name: string
  provider: StorageProvider
  enabled: boolean
  priority: number
  purposes: StoragePurpose[]
  publicUrl?: string
  local?: { basePath: string }
  s3?: {
    endpoint?: string
    region: string
    bucket: string
    prefix?: string
    accessKeyId?: string
    secretAccessKey?: string
    forcePathStyle: boolean
  }
}

type StoredS3Config =
  | {
      endpoint?: string | null
      region?: string
      bucket?: string
      prefix?: string | null
      forcePathStyle?: boolean
      credentialsConfigured?: boolean
      accessKeyIdEncrypted?: string | null
      secretAccessKeyEncrypted?: string | null
    }
  | null
  | undefined

type StorageTestResult = {
  ok: boolean
  message: string
  capacity?: { totalBytes: number; usedBytes: number; freeBytes: number }
}

function parseStorageInput(value: unknown): StorageInput {
  if (!isRecord(value)) throw badRequest("Request body must be an object")
  const name = requiredString(value.name, "name", 100)
  if (name.length < 2)
    throw badRequest("name must contain at least 2 characters")
  const provider = enumValue(
    value.provider,
    Object.values(StorageProvider),
    "provider"
  )
  const enabled = typeof value.enabled === "boolean" ? value.enabled : false
  const priority = integerValue(value.priority, 100, 0, 1_000, "priority")
  const purposes = stringArray(
    value.purposes,
    Object.values(StoragePurpose),
    "purposes"
  )
  if (!purposes.length)
    throw badRequest("purposes must contain at least one item")
  const publicUrl = optionalHttpUrl(value.publicUrl, "publicUrl")

  if (provider === StorageProvider.LOCAL) {
    if (!isRecord(value.local))
      throw badRequest("local configuration is required")
    const basePath = requiredString(
      value.local.basePath,
      "local.basePath",
      1_000
    )
    if (!path.isAbsolute(basePath))
      throw badRequest("local.basePath must be an absolute path")
    return {
      name,
      provider,
      enabled,
      priority,
      purposes,
      publicUrl,
      local: { basePath: path.normalize(basePath) },
    }
  }

  if (!isRecord(value.s3)) throw badRequest("s3 configuration is required")
  return {
    name,
    provider,
    enabled,
    priority,
    purposes,
    publicUrl,
    s3: {
      endpoint: optionalHttpUrl(value.s3.endpoint, "s3.endpoint"),
      region: optionalString(value.s3.region, 100) || "us-east-1",
      bucket: requiredString(value.s3.bucket, "s3.bucket", 255),
      prefix: normalizePrefix(optionalString(value.s3.prefix, 1_000)),
      accessKeyId: optionalString(value.s3.accessKeyId, 1_000),
      secretAccessKey: optionalString(value.s3.secretAccessKey, 5_000),
      forcePathStyle: value.s3.forcePathStyle === true,
    },
  }
}

function buildStorageConfig(
  input: StorageInput,
  current?: { provider?: string; s3?: StoredS3Config }
) {
  const common = {
    name: input.name,
    provider: input.provider,
    enabled: input.enabled,
    priority: input.priority,
    purposes: input.purposes,
    publicUrl: input.publicUrl,
    status: StorageStatus.UNKNOWN,
    health: undefined,
    capacity: undefined,
  }
  if (input.provider === StorageProvider.LOCAL)
    return { ...common, local: input.local }

  const existingS3 =
    current?.provider === StorageProvider.S3 ? current.s3 : undefined
  const accessKeyIdEncrypted = input.s3?.accessKeyId
    ? encryptStorageCredential(input.s3.accessKeyId)
    : existingS3?.accessKeyIdEncrypted
  const secretAccessKeyEncrypted = input.s3?.secretAccessKey
    ? encryptStorageCredential(input.s3.secretAccessKey)
    : existingS3?.secretAccessKeyEncrypted
  if (!accessKeyIdEncrypted || !secretAccessKeyEncrypted)
    throw badRequest("S3 credentials are required")

  return {
    ...common,
    s3: {
      endpoint: input.s3?.endpoint,
      region: input.s3?.region,
      bucket: input.s3?.bucket,
      prefix: input.s3?.prefix,
      forcePathStyle: input.s3?.forcePathStyle,
      credentialsConfigured: true,
      accessKeyIdEncrypted,
      secretAccessKeyEncrypted,
    },
  }
}

async function testLocalStorage(
  basePath: string | null | undefined
): Promise<StorageTestResult> {
  if (!basePath) throw new Error("Local path is not configured")
  await access(basePath, fsConstants.R_OK | fsConstants.W_OK)
  const stats = await statfs(basePath, { bigint: true })
  const totalBytes = Number(stats.blocks * stats.bsize)
  const freeBytes = Number(stats.bavail * stats.bsize)
  return {
    ok: true,
    message: "Local path is readable and writable",
    capacity: {
      totalBytes,
      freeBytes,
      usedBytes: Math.max(0, totalBytes - freeBytes),
    },
  }
}

async function testS3Storage(s3: StoredS3Config): Promise<StorageTestResult> {
  if (
    !s3?.bucket ||
    !s3.region ||
    !s3.accessKeyIdEncrypted ||
    !s3.secretAccessKeyEncrypted
  ) {
    throw new Error("S3 configuration or credentials are incomplete")
  }
  const client = new S3Client({
    region: s3.region,
    endpoint: s3.endpoint || undefined,
    forcePathStyle: s3.forcePathStyle ?? false,
    credentials: {
      accessKeyId: decryptStorageCredential(s3.accessKeyIdEncrypted),
      secretAccessKey: decryptStorageCredential(s3.secretAccessKeyEncrypted),
    },
  })
  try {
    await client.send(new HeadBucketCommand({ Bucket: s3.bucket }), {
      abortSignal: AbortSignal.timeout(10_000),
    })
    return {
      ok: true,
      message: "S3 bucket is reachable and credentials are valid",
    }
  } finally {
    client.destroy()
  }
}

function toStorageResponse(storage: Record<string, unknown>) {
  const s3 = isRecord(storage.s3) ? storage.s3 : undefined
  return {
    ...storage,
    ...(s3
      ? {
          s3: {
            endpoint: s3.endpoint,
            region: s3.region,
            bucket: s3.bucket,
            prefix: s3.prefix,
            forcePathStyle: s3.forcePathStyle,
            credentialsConfigured: s3.credentialsConfigured === true,
          },
        }
      : {}),
  }
}

async function ensureUniqueName(name: string, excludeId?: string) {
  const filter: Record<string, unknown> = {
    name: new RegExp(`^${escapeRegExp(name)}$`, "i"),
    deletedAt: null,
  }
  if (excludeId) filter._id = { $ne: excludeId }
  if (await StorageModel.exists(filter))
    throw badRequest(`Storage "${name}" already exists`)
}

function requiredString(value: unknown, field: string, maxLength: number) {
  const result = optionalString(value, maxLength)
  if (!result) throw badRequest(`${field} is required`)
  return result
}
function optionalString(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return undefined
  if (typeof value !== "string" || value.trim().length > maxLength)
    throw badRequest(`Value must be a string up to ${maxLength} characters`)
  return value.trim()
}
function optionalHttpUrl(value: unknown, field: string) {
  const input = optionalString(value, 1_000)
  if (!input) return undefined
  try {
    const url = new URL(input)
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error()
    return url.toString().replace(/\/$/, "")
  } catch {
    throw badRequest(`${field} must be a valid HTTP(S) URL`)
  }
}
function integerValue(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  field: string
) {
  const result = value === undefined || value === "" ? fallback : Number(value)
  if (!Number.isInteger(result) || result < min || result > max)
    throw badRequest(`${field} must be an integer from ${min} to ${max}`)
  return result
}
function enumValue<const T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  if (typeof value !== "string" || !allowed.includes(value as T))
    throw badRequest(`${field} is invalid`)
  return value as T
}
function stringArray<const T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (item) => typeof item === "string" && allowed.includes(item as T)
    )
  )
    throw badRequest(`${field} is invalid`)
  return [...new Set(value)] as T[]
}
function normalizePrefix(value?: string) {
  return value?.replace(/^\/+|\/+$/g, "") || undefined
}
function safeErrorMessage(error: unknown) {
  return (
    error instanceof Error ? error.message : "Storage connection failed"
  ).slice(0, 500)
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
function badRequest(message: string) {
  return Object.assign(new Error(message), { name: "ValidationError" })
}

export default router
