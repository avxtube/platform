export const mediaPurposes = [
  "poster",
  "short-poster",
  "thumbnail",
  "avatar",
  "trailer",
  "video",
  "short",
  "live",
] as const

export type MediaPurpose = (typeof mediaPurposes)[number]
export type MediaKind = "image" | "video"

export type MediaRule = {
  kind: MediaKind
  accept: string[]
  maxBytes: number
  width?: number
  height?: number
  aspectRatio?: number
  outputMimeType?: "image/webp"
  quality?: number
}

export type MediaUploadResult = {
  id?: string
  url: string
  key?: string
  storageId?: string
  externalId?: string
  provider?: "local" | "s3" | "vdohide"
  status?: "processing" | "ready" | "failed"
  purpose: MediaPurpose
  kind: MediaKind
  mimeType: string
  size: number
  width?: number
  height?: number
  skipped?: boolean
}

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"]
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"]

export const mediaRules: Record<MediaPurpose, MediaRule> = {
  poster: {
    kind: "image",
    accept: imageTypes,
    maxBytes: 20 * 1024 ** 2,
    width: 800,
    height: 538,
    aspectRatio: 800 / 538,
    outputMimeType: "image/webp",
    quality: 88,
  },
  "short-poster": {
    kind: "image",
    accept: imageTypes,
    maxBytes: 20 * 1024 ** 2,
    width: 1080,
    height: 1920,
    aspectRatio: 9 / 16,
    outputMimeType: "image/webp",
    quality: 88,
  },
  thumbnail: {
    kind: "image",
    accept: imageTypes,
    maxBytes: 20 * 1024 ** 2,
    width: 1280,
    height: 720,
    aspectRatio: 16 / 9,
    outputMimeType: "image/webp",
    quality: 86,
  },
  avatar: {
    kind: "image",
    accept: imageTypes,
    maxBytes: 10 * 1024 ** 2,
    width: 512,
    height: 512,
    aspectRatio: 1,
    outputMimeType: "image/webp",
    quality: 90,
  },
  trailer: { kind: "video", accept: videoTypes, maxBytes: 1024 ** 3 },
  video: { kind: "video", accept: videoTypes, maxBytes: 10 * 1024 ** 3 },
  short: { kind: "video", accept: videoTypes, maxBytes: 4 * 1024 ** 3 },
  live: { kind: "video", accept: videoTypes, maxBytes: 10 * 1024 ** 3 },
}

export function getMediaRule(purpose: MediaPurpose) {
  return mediaRules[purpose]
}

export function isMediaPurpose(value: unknown): value is MediaPurpose {
  return (
    typeof value === "string" && mediaPurposes.includes(value as MediaPurpose)
  )
}

export function validateMediaType(purpose: MediaPurpose, mimeType: string) {
  return mediaRules[purpose].accept.includes(mimeType.toLowerCase())
}

export function mediaAccept(purpose: MediaPurpose) {
  return mediaRules[purpose].accept.join(",")
}

export function extensionForMimeType(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "application/vnd.apple.mpegurl": "m3u8",
    "application/x-mpegurl": "m3u8",
  }
  return extensions[mimeType.toLowerCase()] ?? "bin"
}
