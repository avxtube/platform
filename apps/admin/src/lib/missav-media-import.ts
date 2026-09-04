import {
  createMissavMediaImport,
  isMissavPageUrl,
  isRecord,
  remoteMediaFields,
  remoteMediaIdFields,
  type MissavMediaImport,
} from "@workspace/media"

export function prepareMissavMediaImport(result: unknown) {
  const bytes = new Uint8Array(16)
  // getRandomValues also works on HTTP development origins, unlike randomUUID.
  globalThis.crypto.getRandomValues(bytes)
  const importId = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
  return createMissavMediaImport(result, importId)
}

export function isMissavProxyImport(metadata: Record<string, unknown>) {
  return (
    isRecord(metadata.import) &&
    metadata.import.mediaMode === "proxy" &&
    isMissavPageUrl(metadata.import.sourceUrl)
  )
}

export async function registerImportedMissavMedia(
  metadata: Record<string, unknown>,
  plan: MissavMediaImport | null
): Promise<Record<string, unknown>> {
  if (!plan) return metadata
  // A manually replaced/removed image or video must use its normal upload flow.
  const assets = plan.assets.filter(
    (asset) =>
      asset.purpose === "thumbnail" ||
      (!asset.sourceUrl && asset.purpose === "video") ||
      metadata[remoteMediaFields[asset.purpose]] === asset.sourceUrl
  )
  const response = await fetch("/api/v1/admin/media/register-missav", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...plan, assets }),
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isRecord(body) || !isRecord(body.mediaIds)) {
    const message = isRecord(body) ? (body.message ?? body.error) : undefined
    throw new Error(
      typeof message === "string" ? message : "Unable to register MissAV media"
    )
  }
  const next = { ...metadata }
  for (const asset of plan.assets) {
    if (!assets.includes(asset)) delete next[remoteMediaIdFields[asset.purpose]]
  }
  for (const asset of assets) {
    const field = remoteMediaIdFields[asset.purpose]
    const id = body.mediaIds[field]
    if (
      !(typeof id === "string" && id) &&
      !(
        Array.isArray(id) &&
        id.length &&
        id.every((value) => typeof value === "string" && value)
      )
    )
      throw new Error("Missing imported media ID")
    next[field] = id
  }
  return next
}
