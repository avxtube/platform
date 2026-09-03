import sharp from "sharp"

import { extensionForMimeType, getMediaRule, type MediaPurpose } from "./types"

export async function processImageBuffer(
  input: Buffer,
  purpose: MediaPurpose,
  options: { mode?: "crop" | "fit" } = {}
) {
  const rule = getMediaRule(purpose)
  if (rule.kind !== "image" || !rule.width || !rule.height)
    throw new Error(`${purpose} is not an image purpose`)

  const image = sharp(input, {
    failOn: "warning",
    limitInputPixels: 80_000_000,
  }).rotate()
  const mode = options.mode ?? "crop"
  const result = await image
    .resize(
      rule.width,
      rule.height,
      mode === "fit"
        ? { fit: "inside", withoutEnlargement: true }
        : { fit: "cover", position: "attention" }
    )
    .webp({ quality: rule.quality ?? 88, effort: 4 })
    .toBuffer({ resolveWithObject: true })

  return {
    buffer: result.data,
    mimeType: "image/webp" as const,
    extension: "webp",
    width: result.info.width,
    height: result.info.height,
  }
}

export function outputExtension(purpose: MediaPurpose, mimeType: string) {
  return getMediaRule(purpose).kind === "image"
    ? "webp"
    : extensionForMimeType(mimeType)
}

export * from "./types"
