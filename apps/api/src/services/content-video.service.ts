import type { Video } from "@workspace/core/types"
import {
  ChannelModel,
  ContentModel,
  TermModel,
  type ContentSchemaType,
} from "@workspace/db/models"
import type { QueryFilter } from "mongoose"

export function publicVideoFilter(): QueryFilter<ContentSchemaType> {
  return {
    kind: "video",
    status: "published",
    visibility: "public",
    moderationStatus: "active",
    deletedAt: { $exists: false },
    $and: [
      {
        $or: [
          { publishedAt: { $exists: false } },
          { publishedAt: null },
          { publishedAt: { $lte: new Date() } },
        ],
      },
    ],
  }
}

export async function findPublicVideo(idOrSlug: string) {
  return ContentModel.findOne({
    ...publicVideoFilter(),
    $or: [{ _id: idOrSlug }, { slug: idOrSlug.toLowerCase() }],
  }).lean()
}

export async function mapContentsToVideos(
  contents: Array<Record<string, unknown>>
): Promise<Video[]> {
  const metadataList = contents.map((content) => toRecord(content.metadata))
  const channelIds = unique(
    contents.flatMap((content, index) => {
      const metadata = metadataList[index] ?? {}
      return [
        stringValue(metadata.studioId) || stringValue(content.studioId),
        ...stringArray(metadata.actorIds),
        ...stringArray(content.actorIds),
      ]
    })
  )
  const categoryIds = unique(
    metadataList.flatMap((metadata) => stringArray(metadata.categoryIds))
  )
  const [channels, categories] = await Promise.all([
    channelIds.length
      ? ChannelModel.find({
          _id: { $in: channelIds },
          status: "active",
        }).lean()
      : [],
    categoryIds.length
      ? TermModel.find({
          _id: { $in: categoryIds },
          taxonomy: "category",
          status: "active",
        }).lean()
      : [],
  ])
  const channelById = new Map(channels.map((channel) => [channel._id, channel]))
  const categoryById = new Map(categories.map((term) => [term._id, term]))

  return contents.map((content, index) => {
    const metadata = metadataList[index] ?? {}
    const studioId =
      stringValue(metadata.studioId) || stringValue(content.studioId)
    const actorIds = [
      ...stringArray(metadata.actorIds),
      ...stringArray(content.actorIds),
    ]
    const channel =
      (studioId ? channelById.get(studioId) : undefined) ??
      actorIds.map((actorId) => channelById.get(actorId)).find(Boolean)
    const categoryId = stringArray(metadata.categoryIds)[0]
    const category = categoryId ? categoryById.get(categoryId) : undefined
    const stats = toRecord(content.stats)
    const id = stringValue(content._id)
    const slug = stringValue(content.slug)
    const dvdId = stringValue(metadata.dvdId)

    return {
      id: slug || id,
      title: stringValue(content.title) || dvdId || slug || id,
      description: plainText(stringValue(content.description)),
      thumbnailUrl:
        stringValue(metadata.thumbnailUrl) || stringValue(metadata.posterUrl),
      durationSeconds: numberValue(metadata.durationSeconds),
      viewCount: numberValue(stats.viewCount),
      publishedAt: dateValue(
        content.publishedAt ?? content.createdAt ?? content.updatedAt
      ),
      category: category?.name ?? "Other",
      ...(stringValue(metadata.sourceUrl)
        ? { playbackUrl: stringValue(metadata.sourceUrl) }
        : {}),
      ...(stringValue(metadata.trailerUrl)
        ? { previewUrl: stringValue(metadata.trailerUrl) }
        : {}),
      ...(channel
        ? {
            channel: {
              id: channel._id,
              name: channel.name,
              handle: `@${channel.handle}`,
              avatarUrl: channel.avatarUrl ?? null,
              verified: Boolean(channel.verifiedAt),
            },
          }
        : {}),
    }
  })
}

export async function getPublicVideoCategories() {
  const categoryIds = (
    await ContentModel.distinct("metadata.categoryIds", publicVideoFilter())
  ).filter((value): value is string => typeof value === "string" && !!value)
  if (!categoryIds.length) return []
  const terms = await TermModel.find({
    _id: { $in: categoryIds },
    taxonomy: "category",
    status: "active",
  })
    .sort({ name: 1 })
    .lean()
  return terms.map((term) => term.name)
}

export async function resolveCategoryId(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === "all") return undefined
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const term = await TermModel.findOne({
    taxonomy: "category",
    status: "active",
    $or: [
      { _id: normalized },
      { slug: normalized.toLowerCase() },
      { name: new RegExp(`^${escaped}$`, "i") },
    ],
  }).lean()
  return term?._id ?? null
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value)
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && !!item)
    : []
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return new Date(0).toISOString()
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}
