import {
  CONTENT_KINDS,
  CONTENT_MODERATION_STATUSES,
  CONTENT_STATUSES,
  CONTENT_VISIBILITIES,
  ChannelModel,
  ContentModel,
  MediaModel,
  TermModel,
} from "@workspace/db/models"
import { Router, type NextFunction, type Request, type Response } from "express"

import {
  authenticateUser,
  getRequestActor,
  requireAdmin,
} from "../middlewares/user-access.middleware"
import { mockChannels } from "../data/mock-channels"

const router: Router = Router()

router.use(authenticateUser, requireAdmin)

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const kind = optionalEnum(req.query.kind, CONTENT_KINDS)
    const status = optionalEnum(req.query.status, CONTENT_STATUSES)
    const query =
      typeof req.query.query === "string" ? req.query.query.trim() : ""
    const page = positiveInteger(req.query.page, 1)
    const limit = Math.min(positiveInteger(req.query.limit, 20), 100)
    const filter: Record<string, unknown> = { deletedAt: { $exists: false } }

    if (kind) filter.kind = kind
    if (status) filter.status = status
    if (query) {
      const pattern = new RegExp(escapeRegExp(query), "i")
      filter.$or = [
        { title: pattern },
        { slug: pattern },
        { description: pattern },
      ]
    }

    const [items, total] = await Promise.all([
      ContentModel.find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ContentModel.countDocuments(filter),
    ])

    res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    next(error)
  }
})

router.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const content = await ContentModel.findOne({
        _id: req.params.id,
        deletedAt: { $exists: false },
      }).lean()

      if (!content) {
        res.status(404).json({ error: "Content not found" })
        return
      }

      const relations = await resolveContentRelations(content.metadata)
      res.status(200).json({ content, relations })
    } catch (error) {
      next(error)
    }
  }
)

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = getRequestActor(res)
    const input = parseContentInput(req.body, false)
    const content = await ContentModel.create({
      ...input,
      createdBy: actor.id,
    })
    await linkContentMedia(content._id, input.metadata, actor.id)

    res.status(201).json({ content: content.toObject() })
  } catch (error) {
    next(error)
  }
})

router.patch(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const actor = getRequestActor(res)
      const input = parseContentInput(req.body, true)
      const content = await ContentModel.findOneAndUpdate(
        { _id: req.params.id, deletedAt: { $exists: false } },
        { $set: input },
        { new: true, runValidators: true }
      ).lean()

      if (!content) {
        res.status(404).json({ error: "Content not found" })
        return
      }

      await linkContentMedia(content._id, input.metadata, actor.id)

      res.status(200).json({ content })
    } catch (error) {
      next(error)
    }
  }
)

function parseContentInput(value: unknown, partial: boolean) {
  if (!isRecord(value)) throw badRequest("Request body must be an object")

  const result: Record<string, unknown> = {}
  const kind = requiredOrOptionalEnum(
    value.kind,
    CONTENT_KINDS,
    "kind",
    partial
  )
  const status = requiredOrOptionalEnum(
    value.status,
    CONTENT_STATUSES,
    "status",
    partial
  )
  const visibility = requiredOrOptionalEnum(
    value.visibility,
    CONTENT_VISIBILITIES,
    "visibility",
    partial
  )
  const moderationStatus = requiredOrOptionalEnum(
    value.moderationStatus,
    CONTENT_MODERATION_STATUSES,
    "moderationStatus",
    partial
  )

  if (kind !== undefined) result.kind = kind
  if (status !== undefined) result.status = status
  if (visibility !== undefined) result.visibility = visibility
  if (moderationStatus !== undefined) result.moderationStatus = moderationStatus

  assignOptionalString(result, value, "title", 1_000)
  assignOptionalString(result, value, "slug", 300)
  if (typeof result.slug === "string")
    result.slug = normalizeSlug(result.slug) || undefined
  assignOptionalString(result, value, "description", 20_000)
  assignOptionalString(result, value, "studioId", 200)
  assignStringArray(result, value, "termIds")
  assignStringArray(result, value, "actorIds")
  assignOptionalDate(result, value, "publishedAt")
  assignOptionalDate(result, value, "scheduledAt")

  if ("metadata" in value) {
    if (value.metadata !== null && !isRecord(value.metadata)) {
      throw badRequest("metadata must be an object or null")
    }
    result.metadata = value.metadata
  }

  if ("seo" in value) {
    if (value.seo === null) {
      result.seo = null
    } else if (isRecord(value.seo)) {
      const seo: Record<string, unknown> = {}
      assignOptionalString(seo, value.seo, "metaTitle", 300)
      assignOptionalString(seo, value.seo, "metaDescription", 160)
      assignStringArray(seo, value.seo, "keywords")
      result.seo = seo
    } else {
      throw badRequest("seo must be an object or null")
    }
  }

  return result
}

async function resolveContentRelations(metadataValue: unknown) {
  const metadata = toPlainRecord(metadataValue)
  const channelIds = uniqueStrings([
    metadata.studioId,
    ...(Array.isArray(metadata.actorIds) ? metadata.actorIds : []),
  ])
  const termIds = uniqueStrings([
    ...(Array.isArray(metadata.categoryIds) ? metadata.categoryIds : []),
    ...(Array.isArray(metadata.tagIds) ? metadata.tagIds : []),
  ])
  const contentIds = uniqueStrings([metadata.sourceVideoId])

  const [databaseChannels, terms, contents] = await Promise.all([
    channelIds.length
      ? ChannelModel.find({
          _id: { $in: channelIds },
          status: { $ne: "deleted" },
        }).lean()
      : [],
    termIds.length
      ? TermModel.find({ _id: { $in: termIds }, status: "active" }).lean()
      : [],
    contentIds.length
      ? ContentModel.find({
          _id: { $in: contentIds },
          kind: "video",
          deletedAt: { $exists: false },
        })
          .select({ _id: 1, title: 1, slug: 1, kind: 1 })
          .lean()
      : [],
  ])
  const mockChannelById = new Map(
    mockChannels.map((channel) => [channel.id, channel])
  )
  const databaseChannelById = new Map(
    databaseChannels.map((channel) => [channel._id, channel])
  )

  return {
    channels: channelIds.flatMap((id) => {
      const databaseChannel = databaseChannelById.get(id)
      if (databaseChannel)
        return [
          {
            id: databaseChannel._id,
            name: databaseChannel.name,
            handle: databaseChannel.handle,
            avatarUrl: databaseChannel.avatarUrl ?? null,
            kind: databaseChannel.kind,
          },
        ]
      const mockChannel = mockChannelById.get(id)
      return mockChannel ? [mockChannel] : []
    }),
    terms: terms.map((term) => ({
      id: term._id,
      name: term.name,
      slug: term.slug,
      taxonomy: term.taxonomy,
    })),
    contents: contents.map((content) => ({
      id: content._id,
      title: content.title ?? content.slug ?? content._id,
      slug: content.slug ?? content._id,
      kind: content.kind,
    })),
  }
}

function toPlainRecord(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value)
  return isRecord(value) ? value : {}
}

function uniqueStrings(values: unknown[]) {
  return [
    ...new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && Boolean(value.trim())
      )
    ),
  ]
}

async function linkContentMedia(
  contentId: string,
  metadata: unknown,
  createdBy: string
) {
  const values = collectStringValues(metadata)
  if (!values.length) return
  await MediaModel.updateMany(
    {
      url: { $in: values },
      createdBy,
      status: { $in: ["ready", "processing"] },
      deletedAt: null,
    },
    { $set: { contentId } }
  )
}

function collectStringValues(value: unknown) {
  const values = new Set<string>()
  visit(value)
  return [...values]

  function visit(current: unknown): void {
    if (typeof current === "string") {
      if (current.trim()) values.add(current.trim())
      return
    }
    if (Array.isArray(current)) {
      current.forEach(visit)
      return
    }
    if (isRecord(current)) Object.values(current).forEach(visit)
  }
}

function requiredOrOptionalEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
  partial: boolean
): T[number] | undefined {
  if (value === undefined && partial) return undefined
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw badRequest(`${field} must be one of: ${allowed.join(", ")}`)
  }
  return value as T[number]
}

function optionalEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T
): T[number] | undefined {
  return typeof value === "string" && allowed.includes(value)
    ? (value as T[number])
    : undefined
}

function assignOptionalString(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  field: string,
  maxLength: number
) {
  if (!(field in source)) return
  const value = source[field]
  if (value === null || value === "") {
    target[field] = undefined
    return
  }
  if (typeof value !== "string" || value.length > maxLength) {
    throw badRequest(`${field} must be a string up to ${maxLength} characters`)
  }
  target[field] = value.trim()
}

function assignStringArray(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  field: string
) {
  if (!(field in source)) return
  const value = source[field]
  if (value === null) {
    target[field] = undefined
    return
  }
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw badRequest(`${field} must be an array of strings`)
  }
  target[field] = [...new Set(value.map((item) => item.trim()).filter(Boolean))]
}

function assignOptionalDate(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  field: string
) {
  if (!(field in source)) return
  const value = source[field]
  if (value === null || value === "") {
    target[field] = undefined
    return
  }
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw badRequest(`${field} must be an ISO date string`)
  }
  target[field] = new Date(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function positiveInteger(value: unknown, fallback: number) {
  if (typeof value !== "string") return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 300)
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { name: "ValidationError" })
}

export default router
