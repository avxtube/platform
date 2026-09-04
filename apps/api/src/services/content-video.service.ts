import type { Video, Short } from "@workspace/core/types"
import {
  ChannelModel,
  ContentModel,
  MediaModel,
  TermModel,
} from "@workspace/db/models"
import type { PipelineStage } from "mongoose"
import { getDomainSettings } from "./settings/domain-setting.service"

// One settings snapshot per response, shared by every video/short in that response.
export async function getContentMappers() {
  const { domain_static, domain_playlist } = await getDomainSettings()
  return {
    mapVideo: (content: Record<string, unknown>) =>
      mapContentToVideo(content, domain_static, domain_playlist),
    mapShort: (content: Record<string, unknown>) =>
      mapContentToShort(content, domain_static, domain_playlist),
  }
}

function staticContentUrl(
  domain: string,
  contentSlug: string,
  file: "poster.jpg" | "preview.mp4"
) {
  // A missing setting must not send the browser directly to a hotlink-protected source.
  if (!domain || !contentSlug) return ""
  return `https://${domain}/${encodeURIComponent(contentSlug)}/${file}`
}

export function publicVideoFilter(kind = "video"): Record<string, unknown> {
  return { kind, status: "published", visibility: "public", deletedAt: null }
}

// Join only the requested page, using each related collection's _id index.
// Never return complete media metadata (tokens, referrers, etc.) to the viewer.
export function contentLookups(): PipelineStage[] {
  return [
    {
      $lookup: {
        from: ChannelModel.collection.name,
        localField: "channelIds",
        foreignField: "_id",
        pipeline: [
          { $match: { status: "active", deletedAt: null } },
          {
            $project: {
              name: 1,
              handle: 1,
              avatarUrl: 1,
              verifiedAt: 1,
              kind: 1,
              "metadata.roles": 1,
            },
          },
        ],
        as: "channels",
      },
    },
    {
      $lookup: {
        from: MediaModel.collection.name,
        localField: "mediaIds",
        foreignField: "_id",
        pipeline: [
          {
            $match: { deletedAt: null, $or: [{ error: null }, { error: "" }] },
          },
          {
            $project: {
              kind: 1,
              purpose: 1,
              quality: 1,
              provider: 1,
              storageId: 1,
              "metadata.directUrl": 1,
              "metadata.duration": 1,
              "metadata.hls.uri": 1,
              "metadata.hls.media.sourceUrl": 1,
              "metadata.hls.media.duration": 1,
              "metadata.sprite": 1,
            },
          },
        ],
        as: "media",
      },
    },
    {
      $lookup: {
        from: TermModel.collection.name,
        localField: "termIds",
        foreignField: "_id",
        pipeline: [
          { $match: { status: "active", deletedAt: null } },
          { $project: { name: 1, slug: 1, taxonomy: 1 } },
        ],
        as: "terms",
      },
    },
  ]
}

export function contentPagePipeline(
  filter: Record<string, unknown>,
  limit = 24,
  offset = 0,
  sort: Record<string, 1 | -1> = { createdAt: -1, _id: -1 }
): PipelineStage[] {
  return [
    { $match: filter },
    { $sort: sort },
    { $skip: offset },
    { $limit: limit },
    ...contentLookups(),
    {
      $project: {
        _id: 1,
        kind: 1,
        title: 1,
        slug: 1,
        description: 1,
        createdAt: 1,
        stats: 1,
        channelIds: 1,
        mediaIds: 1,
        termIds: 1,
        "metadata.dvdId": 1,
        "metadata.commentPolicy": 1,
        channels: 1,
        media: 1,
        terms: 1,
      },
    },
  ]
}

export function getPublicContents(
  filter: Record<string, unknown> = publicVideoFilter(),
  limit = 24,
  offset = 0,
  sort?: Record<string, 1 | -1>
) {
  return ContentModel.aggregate<Record<string, unknown>>(
    contentPagePipeline(filter, limit, offset, sort)
  ).exec()
}

export async function findPublicVideo(idOrSlug: string, kind = "video") {
  const [content] = await getPublicContents(
    {
      ...publicVideoFilter(kind),
      $or: [{ _id: idOrSlug }, { slug: idOrSlug.toLowerCase() }],
    },
    1
  )
  return content ?? null
}

export function mapContentToVideo(
  content: Record<string, unknown>,
  staticDomain = "",
  playlistDomain = ""
): Video {
  const metadata = toRecord(content.metadata)
  const channels = orderedRelations(content.channels, content.channelIds)
  const channel =
    channels.find((item) =>
      stringArray(toRecord(item.metadata).roles).includes("studio")
    ) ??
    channels.find((item) =>
      stringArray(toRecord(item.metadata).roles).includes("actor")
    )
  const media = orderedRelations(content.media, content.mediaIds)
  const playable = media
    .filter((item) => item.purpose === "video" || item.purpose === "short")
    .sort(
      (left, right) => qualityRank(right.quality) - qualityRank(left.quality)
    )
  const source = playable.find((item) => mediaUrl(item)) ?? playable[0]
  const poster =
    media.find((item) => item.purpose === "poster") ??
    media.find(
      (item) => item.purpose === "thumbnail" && !toRecord(item.metadata).sprite
    )
  const trailer = media.find((item) => item.purpose === "trailer")
  const contentSlug = stringValue(content.slug)
  const posterUrl = poster
    ? staticContentUrl(staticDomain, contentSlug, "poster.jpg")
    : ""
  const previewUrl = trailer
    ? staticContentUrl(staticDomain, contentSlug, "preview.mp4")
    : ""
  const category = orderedRelations(content.terms, content.termIds).find(
    (item) => item.taxonomy === "category"
  )
  const sourceMetadata = toRecord(source?.metadata)
  const id = stringValue(content.slug) || stringValue(content._id)
  const player =
    content.kind === "video" && contentSlug && staticDomain && playlistDomain
      ? {
          vdoId: contentSlug,
          node: { static: staticDomain, playlist: playlistDomain },
        }
      : undefined
  return {
    id,
    title: stringValue(content.title) || stringValue(metadata.dvdId) || id,
    description: plainText(stringValue(content.description)),
    thumbnailUrl: posterUrl,
    durationSeconds:
      numberValue(sourceMetadata.duration) ||
      numberValue(toRecord(toRecord(sourceMetadata.hls).media).duration),
    viewCount: numberValue(toRecord(content.stats).viewCount),
    publishedAt: dateValue(content.createdAt),
    category: stringValue(category?.name) || "Other",
    ...(content.kind === "short" && mediaUrl(source)
      ? { playbackUrl: mediaUrl(source) }
      : {}),
    ...(previewUrl ? { previewUrl } : {}),
    ...(player ? { player } : {}),
    ...(channel
      ? {
          channel: {
            id: stringValue(channel._id),
            name: stringValue(channel.name),
            handle: `@${stringValue(channel.handle).replace(/^@/, "")}`,
            avatarUrl: stringValue(channel.avatarUrl) || null,
            verified: Boolean(channel.verifiedAt),
          },
        }
      : {}),
  }
}

export function mapContentToShort(
  content: Record<string, unknown>,
  staticDomain = "",
  playlistDomain = ""
): Short {
  const stats = toRecord(content.stats)
  const policy = toRecord(content.metadata).commentPolicy
  return {
    ...mapContentToVideo(content, staticDomain, playlistDomain),
    likeCount: numberValue(stats.likeCount),
    commentCount: numberValue(stats.commentCount),
    shareCount: numberValue(stats.shareCount),
    commentPolicy:
      policy === "disabled" || policy === "review" ? policy : "enabled",
  }
}

export async function getPublicVideoCategories() {
  const rows = await ContentModel.aggregate<{ name: string }>([
    { $match: publicVideoFilter() },
    { $unwind: "$termIds" },
    { $group: { _id: "$termIds" } },
    {
      $lookup: {
        from: TermModel.collection.name,
        localField: "_id",
        foreignField: "_id",
        pipeline: [
          {
            $match: { taxonomy: "category", status: "active", deletedAt: null },
          },
          { $project: { name: 1 } },
        ],
        as: "term",
      },
    },
    { $unwind: "$term" },
    { $project: { _id: 0, name: "$term.name" } },
    { $sort: { name: 1 } },
  ])
  return rows.map((term) => term.name)
}

export async function resolveCategoryId(value: string) {
  const normalized = value.trim()
  if (!normalized || normalized === "all") return undefined
  const term = await TermModel.findOne({
    taxonomy: "category",
    status: "active",
    deletedAt: null,
    $or: [
      { _id: normalized },
      { slug: normalized.toLowerCase() },
      { name: new RegExp(`^${escapeRegExp(normalized)}$`, "i") },
    ],
  })
    .select("_id")
    .lean()
  return term?._id ?? null
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
export function toRecord(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value)
  return isRecord(value) ? value : {}
}
export function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && !!item)
    : []
}
export function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}
export function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString()
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return new Date(0).toISOString()
}
export function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
function orderedRelations(value: unknown, idsValue: unknown) {
  const ids = stringArray(idsValue)
  const rows = Array.isArray(value) ? value.filter(isRecord) : []
  return rows
    .filter((item) => ids.includes(stringValue(item._id)))
    .sort(
      (a, b) =>
        ids.indexOf(stringValue(a._id)) - ids.indexOf(stringValue(b._id))
    )
}
function qualityRank(value: unknown) {
  return value === "original" ? 10000 : Number(value) || 0
}
export function mediaUrl(media?: Record<string, unknown>) {
  const metadata = toRecord(media?.metadata)
  const hls = toRecord(metadata.hls)
  const stored =
    Boolean(media?.storageId) ||
    media?.provider === "local" ||
    media?.provider === "s3"
  const url =
    (stored ? stringValue(metadata.directUrl) : "") ||
    stringValue(hls.uri) ||
    stringValue(toRecord(hls.media).sourceUrl) ||
    stringValue(metadata.directUrl)
  return /^(https?:\/\/|\/(?!\/))/.test(url) ? url : ""
}
