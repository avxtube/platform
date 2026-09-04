export type RemoteMediaPurpose = "poster" | "trailer" | "video" | "thumbnail"

export type RemoteMediaAsset = {
  purpose: RemoteMediaPurpose
  sourceUrl?: string
  metadata: Record<string, unknown>
}

export type MissavMediaImport = {
  importId: string
  sourcePageUrl: string
  assets: RemoteMediaAsset[]
}

export function hasPlayableMissavPlaylist(
  plan: MissavMediaImport | null | undefined
) {
  const video = plan?.assets.find((asset) => asset.purpose === "video")
  const hls = video?.metadata.hls
  return (
    isRecord(hls) &&
    Array.isArray(hls.variants) &&
    hls.variants.length > 0 &&
    hls.variants.every(isRecord)
  )
}

export const remoteMediaFields: Record<RemoteMediaPurpose, string> = {
  poster: "thumbnailUrl",
  trailer: "trailerUrl",
  video: "sourceUrl",
  thumbnail: "spriteUrl",
}

export const remoteMediaIdFields: Record<RemoteMediaPurpose, string> = {
  poster: "posterMediaId",
  trailer: "trailerMediaId",
  video: "videoMediaId",
  thumbnail: "thumbnailMediaId",
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

export function cleanRemoteUrl(value: unknown) {
  if (typeof value !== "string") return ""
  const text = value.trim()
  return /^\[(https?:\/\/[^\]]+)\]\(https?:\/\/[^)]+\)$/.exec(text)?.[1] ?? text
}

export function isMissavPageUrl(value: unknown) {
  try {
    const url = new URL(cleanRemoteUrl(value))
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.href.length <= 4_000 &&
      (url.hostname === "missav.ai" || url.hostname.endsWith(".missav.ai"))
    )
  } catch {
    return false
  }
}

function isAllowedMissavRemoteUrl(value: string) {
  try {
    const url = new URL(value)
    const allowed = ["missav.ai", "fourhoi.com", "surrit.com"].some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    )
    return (
      allowed &&
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.port &&
      value.length <= 4_000
    )
  } catch {
    return false
  }
}

function normalizeSpriteMetadata(metadata: Record<string, unknown>) {
  if (!isRecord(metadata.sprite)) return metadata
  const sprite = { ...metadata.sprite }
  if (sprite.sourceTemplate !== undefined) {
    const sourceTemplate = cleanRemoteUrl(sprite.sourceTemplate)
    if (
      !isAllowedMissavRemoteUrl(sourceTemplate) ||
      sourceTemplate.match(/\{index\}/g)?.length !== 1
    )
      throw new Error("Invalid remote sprite source template")
    sprite.sourceTemplate = sourceTemplate
  }
  if (
    sprite.firstIndex !== undefined &&
    (!Number.isSafeInteger(sprite.firstIndex) || Number(sprite.firstIndex) < 0)
  )
    throw new Error("Invalid remote sprite first index")
  if (
    sprite.imageCount !== undefined &&
    (!Number.isSafeInteger(sprite.imageCount) || Number(sprite.imageCount) < 1)
  )
    throw new Error("Invalid remote sprite image count")
  return { ...metadata, sprite }
}

// The scraper's thumbnail is a sprite descriptor, not the poster image.
export function createMissavMediaImport(
  result: unknown,
  importId: string
): MissavMediaImport | null {
  if (!isRecord(result) || !isRecord(result.data)) return null
  const data = result.data
  const sourcePageUrl = [data.sourceUrl, result.url]
    .map(cleanRemoteUrl)
    .find(isMissavPageUrl)
  if (!sourcePageUrl) return null
  const assets: RemoteMediaAsset[] = []
  const video = isRecord(data.video) ? data.video : undefined
  const videoUrl =
    cleanRemoteUrl(video?.sourceUrl) || cleanRemoteUrl(data.m3u8Url)
  if (videoUrl || video)
    assets.push({
      purpose: "video",
      ...(videoUrl ? { sourceUrl: videoUrl } : {}),
      metadata: { format: "hls", ...(video ? { hls: video } : {}) },
    })
  for (const purpose of ["poster", "trailer"] as const) {
    const sourceUrl = cleanRemoteUrl(data[purpose])
    if (sourceUrl) assets.push({ purpose, sourceUrl, metadata: {} })
  }
  const sprite = isRecord(data.thumbnail) ? data.thumbnail : undefined
  const thumbnailUrl =
    cleanRemoteUrl(sprite?.sourceUrl) ||
    cleanRemoteUrl(sprite?.url) ||
    cleanRemoteUrl(data.thumbnail)
  if (sprite || thumbnailUrl)
    assets.push({
      purpose: "thumbnail",
      ...(thumbnailUrl ? { sourceUrl: thumbnailUrl } : {}),
      metadata: { ...(sprite ? { sprite } : {}) },
    })
  return parseMissavMediaImport({ importId, sourcePageUrl, assets })
}

// Used on the API as well: client-supplied plans are never trusted implicitly.
export function parseMissavMediaImport(value: unknown): MissavMediaImport {
  if (
    !isRecord(value) ||
    typeof value.importId !== "string" ||
    !/^[a-f0-9]{32}$/.test(value.importId)
  )
    throw new Error("Invalid media import ID")
  if (!isMissavPageUrl(value.sourcePageUrl))
    throw new Error("A MissAV source page is required")
  if (!Array.isArray(value.assets) || value.assets.length > 4)
    throw new Error("At most four remote media assets are allowed")
  if (JSON.stringify(value).length > 1_000_000)
    throw new Error("Remote media descriptors are too large")
  const purposes = new Set<string>()
  const assets = value.assets.map((asset): RemoteMediaAsset => {
    if (!isRecord(asset)) throw new Error("Invalid remote media asset")
    const purpose = asset.purpose
    if (
      purpose !== "video" &&
      purpose !== "trailer" &&
      purpose !== "poster" &&
      purpose !== "thumbnail"
    )
      throw new Error("Invalid remote media purpose")
    if (purposes.has(purpose)) throw new Error("Duplicate remote media purpose")
    purposes.add(purpose)
    const sourceUrl = cleanRemoteUrl(asset.sourceUrl)
    if (sourceUrl && !isAllowedMissavRemoteUrl(sourceUrl))
      throw new Error("Remote media URL is not an allowed MissAV origin")
    const rawMetadata = isRecord(asset.metadata) ? asset.metadata : {}
    const metadata =
      purpose === "thumbnail"
        ? normalizeSpriteMetadata(rawMetadata)
        : rawMetadata
    if (
      !sourceUrl &&
      !(purpose === "thumbnail" && isRecord(metadata.sprite)) &&
      !(purpose === "video" && isRecord(metadata.hls))
    )
      throw new Error("Remote media requires a source URL or descriptor")
    return { purpose, ...(sourceUrl ? { sourceUrl } : {}), metadata }
  })
  return {
    importId: value.importId,
    sourcePageUrl: cleanRemoteUrl(value.sourcePageUrl),
    assets,
  }
}
