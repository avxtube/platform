import { createHash } from "node:crypto"
import {
  ChannelModel,
  ContentModel,
  MediaModel,
  TermModel,
} from "@workspace/db/models"
import type { ContentRelations } from "@workspace/core/types/content"

export function record(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value)
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}

export function ids(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter(
              (item): item is string =>
                typeof item === "string" && Boolean(item.trim())
            )
            .map((item) => item.trim())
        ),
      ]
    : []
}

export function channelPositions(kind: string, metadata: unknown): string[] {
  const roles = ids(record(metadata).roles)
  // Read old records without rewriting their IDs or stored classification.
  if (kind === "actor") roles.push("actor")
  if (kind === "studio") roles.push("studio")
  return [
    ...new Set(
      roles.map((role) =>
        role === "actor" ? "actors" : role === "director" ? "directors" : role
      )
    ),
  ]
}

export async function resolveContentRelations(
  value: unknown,
  options: { staticDomain?: string } = {}
): Promise<ContentRelations> {
  const content = record(value)
  const metadata = record(content.metadata)
  const channelIds = ids(
    content.channelIds ?? [metadata.studioId, ...ids(metadata.actorIds)]
  )
  const termIds = ids(
    content.termIds ?? [...ids(metadata.categoryIds), ...ids(metadata.tagIds)]
  )
  const mediaIds = ids(
    content.mediaIds ??
      Object.entries(metadata)
        .filter(([key]) =>
          /^(poster|trailer|video|thumbnail)MediaId$/.test(key)
        )
        .map(([, id]) => id)
  )
  const [channels, terms, media, contents] = await Promise.all([
    channelIds.length
      ? ChannelModel.find({ _id: { $in: channelIds }, deletedAt: null }).lean()
      : [],
    termIds.length
      ? TermModel.find({ _id: { $in: termIds }, status: "active" }).lean()
      : [],
    mediaIds.length
      ? MediaModel.find({ _id: { $in: mediaIds }, deletedAt: null }).lean()
      : [],
    typeof metadata.sourceVideoId === "string"
      ? ContentModel.find({
          _id: metadata.sourceVideoId,
          kind: "video",
          deletedAt: null,
        })
          .select("_id title slug")
          .lean()
      : [],
  ])
  const channelById = new Map(channels.map((item) => [item._id, item]))
  const termById = new Map(terms.map((item) => [item._id, item]))
  const mediaById = new Map(media.map((item) => [item._id, item]))
  return {
    channels: channelIds.flatMap((id) => {
      const item = channelById.get(id)
      return item
        ? [
            {
              id,
              name: item.name,
              handle: item.handle,
              avatarUrl: item.avatarUrl ?? null,
              kind: item.kind,
              positions: channelPositions(item.kind, item.metadata),
            },
          ]
        : []
    }),
    terms: termIds.flatMap((id) => {
      const item = termById.get(id)
      return item
        ? [{ id, name: item.name, slug: item.slug, taxonomy: item.taxonomy }]
        : []
    }),
    media: mediaIds.flatMap((id) => {
      const item = mediaById.get(id)
      if (!item) return []
      const legacy = record(item)
      const directUrl =
        item.metadata?.directUrl ?? legacy.url ?? legacy.sourceUrl
      const contentSlug =
        typeof content.slug === "string" ? content.slug : ""
      const staticFile =
        item.purpose === "poster"
          ? "poster.jpg"
          : item.purpose === "trailer"
            ? "preview.mp4"
            : undefined
      const url =
        staticFile && options.staticDomain && contentSlug
          ? `//${options.staticDomain}/${encodeURIComponent(contentSlug)}/${staticFile}`
          : directUrl
      return [
        {
          id,
          position: item.purpose ?? "other",
          kind: item.kind,
          quality: item.quality ?? undefined,
          provider: item.provider,
          url: typeof url === "string" ? url : null,
        },
      ]
    }),
    contents: contents.map((item) => ({
      id: item._id,
      title: item.title ?? item.slug ?? item._id,
      slug: item.slug ?? item._id,
      kind: "video",
    })),
  }
}

const slots = [
  {
    field: "thumbnailUrl",
    purpose: "poster",
    idField: "posterMediaId",
    kind: "image",
  },
  {
    field: "posterUrl",
    purpose: "poster",
    idField: "posterMediaId",
    kind: "image",
  },
  {
    field: "trailerUrl",
    purpose: "trailer",
    idField: "trailerMediaId",
    kind: "video",
  },
  {
    field: "sourceUrl",
    purpose: "video",
    idField: "videoMediaId",
    kind: "video",
  },
  {
    field: "mediaUrl",
    purpose: "short",
    idField: "videoMediaId",
    kind: "video",
  },
] as const

// Accept the editor's transient fields (also used by quick import), but never
// persist a URL or a named relation ID in Content.metadata.
export async function prepareContentReferences(
  input: Record<string, unknown>,
  actorId: string,
  options: { staticDomain?: string } = {}
) {
  const metadata = { ...record(input.metadata) }
  if ("channelIds" in input || "studioId" in metadata || "actorIds" in metadata)
    input.channelIds = ids(
      input.channelIds ?? [metadata.studioId, ...ids(metadata.actorIds)]
    )
  if ("termIds" in input || "categoryIds" in metadata || "tagIds" in metadata)
    input.termIds = ids(
      input.termIds ?? [...ids(metadata.categoryIds), ...ids(metadata.tagIds)]
    )

  const mediaIds = ids(input.mediaIds)
  const importedIds = Object.entries(metadata)
    .filter(([key]) => /^(poster|trailer|video|thumbnail)MediaId$/.test(key))
    .flatMap(([, value]) => (typeof value === "string" ? [value] : ids(value)))
  mediaIds.push(...importedIds)

  // Check existing references before creating URL-only media records.
  await Promise.all([
    assertReferences(ChannelModel, ids(input.channelIds), "channel"),
    assertReferences(TermModel, ids(input.termIds), "term"),
    assertReferences(MediaModel, ids(mediaIds), "media"),
  ])
  const selectedMedia = mediaIds.length
    ? await MediaModel.find({
        _id: { $in: ids(mediaIds) },
        deletedAt: null,
      }).lean()
    : []
  if (selectedMedia.some((item) => item.error))
    throw invalid("Media upload failed or is incomplete; retry before saving")
  for (const slot of slots) {
    const url = metadata[slot.field]
    if (typeof url !== "string" || !url.trim()) continue
    // Media registered/uploaded in this request already carries its position.
    if (
      importedIds.includes(String(metadata[slot.idField])) ||
      Array.isArray(metadata[slot.idField])
    )
      continue
    const sourceUrl = url.trim()
    if (
      isStaticMediaUrl(
        sourceUrl,
        options.staticDomain,
        input.slug,
        slot.purpose
      ) &&
      selectedMedia.some((item) => item.purpose === slot.purpose)
    )
      continue
    if (
      selectedMedia.some(
        (item) =>
          item.purpose === slot.purpose &&
          item.metadata?.directUrl === sourceUrl
      )
    )
      continue
    const existing = await MediaModel.findOne({
      purpose: slot.purpose,
      deletedAt: null,
      $or: [{ "metadata.directUrl": sourceUrl }, { url: sourceUrl }],
    }).lean()
    if (existing) {
      if (existing.error)
        throw invalid("Media upload failed; retry before saving")
      mediaIds.push(existing._id)
      continue
    }
    const directUrl = validMediaUrl(sourceUrl)
    const id = createHash("sha256")
      .update(JSON.stringify([actorId, slot.purpose, directUrl]))
      .digest("hex")
    await MediaModel.updateOne(
      { _id: id },
      {
        $setOnInsert: {
          _id: id,
          purpose: slot.purpose,
          kind: slot.kind,
          provider: "remote",
          ...(slot.kind === "video" ? { quality: "original" } : {}),
          metadata: { directUrl },
        },
      },
      { upsert: true, runValidators: true }
    )
    mediaIds.push(id)
  }
  if (
    "mediaIds" in input ||
    mediaIds.length ||
    slots.some((slot) => slot.field in metadata)
  )
    input.mediaIds = ids(mediaIds)
  for (const field of [
    "studioId",
    "actorIds",
    "categoryIds",
    "tagIds",
    "posterMediaId",
    "trailerMediaId",
    "videoMediaId",
    "thumbnailMediaId",
    "spriteUrl",
    ...slots.map((slot) => slot.field),
  ])
    delete metadata[field]
  if ("metadata" in input) input.metadata = metadata
}

function isStaticMediaUrl(
  value: string,
  domain: string | undefined,
  slug: unknown,
  purpose: (typeof slots)[number]["purpose"]
) {
  const file =
    purpose === "poster"
      ? "poster.jpg"
      : purpose === "trailer"
        ? "preview.mp4"
        : undefined
  return (
    Boolean(file) &&
    Boolean(domain) &&
    typeof slug === "string" &&
    value === `//${domain}/${encodeURIComponent(slug)}/${file}`
  )
}

async function assertReferences(
  model: {
    countDocuments(filter: Record<string, unknown>): PromiseLike<number>
  },
  references: string[],
  name: string
) {
  if (!references.length) return
  const count = await model.countDocuments({
    _id: { $in: references },
    deletedAt: null,
  })
  if (count !== references.length)
    throw invalid(`One or more ${name} IDs do not exist`)
}

function validMediaUrl(value: string) {
  try {
    const url = new URL(value)
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error()
    return url.href
  } catch {
    throw invalid("Media URL must be an absolute HTTP(S) URL")
  }
}

function invalid(message: string) {
  return Object.assign(new Error(message), { name: "ValidationError" })
}
