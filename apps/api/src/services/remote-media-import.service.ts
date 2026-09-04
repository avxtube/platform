import { createHash } from "node:crypto"
import {
  MediaModel,
  MEDIA_QUALITIES,
  type MediaQuality,
} from "@workspace/db/models"
import {
  isRecord,
  parseMissavMediaImport,
  remoteMediaIdFields,
} from "@workspace/media"

export async function registerMissavMedia(input: unknown, createdBy: string) {
  let plan
  try {
    plan = parseMissavMediaImport(input)
  } catch (error) {
    throw Object.assign(
      error instanceof Error ? error : new Error("Invalid remote media import"),
      { status: 400 }
    )
  }

  // Stable IDs make retries safe without downloading any source assets.
  // Include the source descriptor so replacing an asset creates a new record.
  const assets = plan.assets.flatMap((asset) => {
    const sprite = asset.metadata.sprite
    if (
      asset.purpose === "thumbnail" &&
      isRecord(sprite) &&
      typeof sprite.secondsPerImage === "number" &&
      Number.isFinite(sprite.secondsPerImage)
    ) {
      return [
        {
          ...asset,
          quality: undefined,
          metadata: {
            ...asset.metadata,
            sprite: {
              ...sprite,
              secondsPerImage: Math.round(sprite.secondsPerImage),
            },
          },
        },
      ]
    }
    const hls = asset.metadata.hls
    if (
      asset.purpose !== "video" ||
      !isRecord(hls) ||
      !Array.isArray(hls.variants) ||
      !hls.variants.length
    )
      return [
        {
          ...asset,
          quality:
            asset.purpose === "video" || asset.purpose === "trailer"
              ? "original"
              : undefined,
        },
      ]
    return hls.variants.map((variant: unknown) => {
      if (!isRecord(variant)) throw new Error("Invalid video rendition")
      const resolution = isRecord(variant.resolution) ? variant.resolution : {}
      const quality = String(resolution.height ?? "")
      if (!isQuality(quality) || quality === "original")
        throw new Error(`Unsupported video quality: ${quality}`)
      return {
        ...asset,
        quality,
        metadata: {
          ...asset.metadata,
          width: resolution.width,
          height: resolution.height,
          // One Media is one rendition: keep only this variant descriptor.
          // Master-level data and the variants array belong to the scraper input.
          hls: variant,
        },
      }
    })
  })
  const records = assets.map((asset) => ({
    _id: createHash("sha256")
      .update(
        JSON.stringify([createdBy, plan.importId, plan.sourcePageUrl, asset])
      )
      .digest("hex"),
    kind:
      asset.purpose === "poster" || asset.purpose === "thumbnail"
        ? "image"
        : "video",
    purpose: asset.purpose,
    quality: asset.quality,
    provider: "remote",
    metadata: {
      ...asset.metadata,
      sourceProvider: "missav",
      sourcePageUrl: plan.sourcePageUrl,
      referrerUrl: "https://missav.ai/",
      ...(asset.sourceUrl ? { directUrl: asset.sourceUrl } : {}),
    },
  }))
  // Validate the whole batch before any writes (including schema validation).
  await Promise.all(records.map((record) => new MediaModel(record).validate()))
  await Promise.all(
    records.map((record) =>
      MediaModel.updateOne(
        { _id: record._id },
        { $setOnInsert: record },
        { upsert: true }
      )
    )
  )
  const result: Record<string, string | string[]> = {}
  for (const record of records) {
    const field = remoteMediaIdFields[record.purpose]
    const previous = result[field]
    result[field] = previous
      ? [...(Array.isArray(previous) ? previous : [previous]), record._id]
      : record._id
  }
  return result
}

function isQuality(value: string): value is MediaQuality {
  return MEDIA_QUALITIES.some((quality) => quality === value)
}
