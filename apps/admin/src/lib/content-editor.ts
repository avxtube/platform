import type { AdminContent } from "./content"

const mediaFields = {
  poster: "thumbnailUrl",
  trailer: "trailerUrl",
  video: "sourceUrl",
  short: "mediaUrl",
} as const

export function editorMetadata(
  content?: AdminContent
): Record<string, unknown> {
  const metadata = { ...content?.metadata }
  const relations = content?.relations
  if (!relations) return metadata
  // Old named IDs are read through relations, not retained as hidden values
  // which could override a newly selected poster or trailer on the next save.
  for (const field of [
    "posterMediaId",
    "trailerMediaId",
    "videoMediaId",
    "thumbnailMediaId",
  ])
    delete metadata[field]
  metadata.studioIds =
    content.studioIds ??
    relations.channels
      .filter((item) => item.positions.includes("studio"))
      .map((item) => item.id)
  metadata.actressIds =
    content.actressIds ??
    relations.channels
      .filter((item) => item.positions.includes("actresses"))
      .map((item) => item.id)
  metadata.actorIds =
    content.actorIds ??
    relations.channels
      .filter((item) => item.positions.includes("actors"))
      .map((item) => item.id)
  metadata.directorIds =
    content.directorIds ??
    relations.channels
      .filter((item) => item.positions.includes("directors"))
      .map((item) => item.id)
  if (content.termIds) {
    metadata.categoryIds = relations.terms
      .filter((item) => item.taxonomy === "category")
      .map((item) => item.id)
    metadata.tagIds = relations.terms
      .filter((item) => item.taxonomy === "tag")
      .map((item) => item.id)
    metadata.labelIds = relations.terms
      .filter((item) => item.taxonomy === "label")
      .map((item) => item.id)
    metadata.seriesIds = relations.terms
      .filter((item) => item.taxonomy === "series")
      .map((item) => item.id)
  }
  if (content.mediaIds || relations.media.length) {
    for (const [position, field] of Object.entries(mediaFields)) {
      const items = relations.media.filter((item) => item.position === position)
      const selected =
        items.find((item) => item.quality === "original") ?? items[0]
      metadata[field] = selected?.url ?? ""
    }
  }
  return metadata
}

// Uneditable relations (directors, galleries, additional renditions, etc.) survive
// an ordinary edit. Clearing a represented field removes only that selection.
export function contentEditorReferences(
  metadata: Record<string, unknown>,
  content?: AdminContent
) {
  const relations = content?.relations
  const handledTerms = new Set(relations?.terms.map((item) => item.id))
  const studioIds = strings(
    metadata.studioIds ?? (metadata.studioId ? [metadata.studioId] : [])
  )
  const actressIds = strings(metadata.actressIds)
  const actorIds = strings(metadata.actorIds)
  const directorIds = strings(metadata.directorIds)
  const termIds = strings([
    ...(content?.termIds ?? []).filter((id) => !handledTerms.has(id)),
    ...strings(metadata.categoryIds),
    ...strings(metadata.tagIds),
    ...strings(metadata.labelIds),
    ...strings(metadata.seriesIds),
  ])
  const initial = editorMetadata(content)
  const mediaIds = (
    content?.mediaIds ??
    relations?.media.map((item) => item.id) ??
    []
  ).filter((id) => {
    const item = relations?.media.find((media) => media.id === id)
    if (!item) return true
    const field = mediaField(item.position)
    return !field || metadata[field] === initial[field]
  })
  return { studioIds, actressIds, actorIds, directorIds, termIds, mediaIds }
}

function mediaField(position: string) {
  return Object.entries(mediaFields).find(([key]) => key === position)?.[1]
}

export function strings(value: unknown): string[] {
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

export function withImportUrlCategories(
  categories: string[],
  urls: unknown[]
): string[] {
  if (!urls.some(hasUncensoredLeakPath)) return categories
  return [
    "Uncensored leak",
    ...categories.filter(
      (name) => normalizeCategoryName(name) !== "uncensored-leak"
    ),
  ]
}

function hasUncensoredLeakPath(value: unknown) {
  if (typeof value !== "string") return false
  try {
    return decodeURIComponent(value).toLowerCase().includes("uncensored-leak")
  } catch {
    return value.toLowerCase().includes("uncensored-leak")
  }
}

function normalizeCategoryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
}
