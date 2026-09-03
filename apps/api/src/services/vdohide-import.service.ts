import { randomUUID } from "node:crypto"

import { MediaModel } from "@workspace/db/models"
import { getMediaRule, type MediaPurpose } from "@workspace/media"

type VdoHideImportResponse = {
  success?: boolean
  cloned?: boolean
  data?: {
    id?: string
    slug?: string
    name?: string
    source?: string
  }
  error?: string
  message?: string
}

export async function importVideoToVdoHide({
  purpose,
  sourceUrl,
  fallbackUrl,
  createdBy,
  cookie,
  authorization,
}: {
  purpose: MediaPurpose
  sourceUrl: string
  fallbackUrl?: string
  createdBy: string
  cookie?: string
  authorization?: string
}) {
  const rule = getMediaRule(purpose)
  if (rule.kind !== "video" || (purpose !== "video" && purpose !== "short"))
    throw httpError(400, `${purpose} does not use VdoHide import`)

  const importUrl = process.env.VDOHIDE_IMPORT_URL?.trim()
  if (!importUrl) {
    const url = fallbackUrl?.trim() || sourceUrl
    return {
      url,
      status: "ready" as const,
      purpose,
      kind: "video" as const,
      mimeType: inferVideoMimeType(url),
      size: 0,
      skipped: true,
    }
  }

  const id = randomUUID()
  const mediaRecord = await MediaModel.create({
    _id: id,
    kind: "video",
    purpose,
    provider: "vdohide",
    status: "processing",
    sourceUrl,
    createdBy,
  })

  try {
    const headers = new Headers({ "content-type": "application/json" })
    if (cookie) headers.set("cookie", cookie)
    if (authorization) headers.set("authorization", authorization)
    const response = await fetch(importUrl, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(10 * 60_000),
      body: JSON.stringify({
        source: sourceUrl,
        ...(process.env.VDOHIDE_SPACE_SLUG
          ? { spaceSlug: process.env.VDOHIDE_SPACE_SLUG }
          : {}),
        ...(process.env.VDOHIDE_FOLDER_SLUG
          ? { folderSlug: process.env.VDOHIDE_FOLDER_SLUG }
          : {}),
      }),
    })
    const body = (await response
      .json()
      .catch(() => null)) as VdoHideImportResponse | null
    if (!response.ok || !body?.success || !body.data?.id)
      throw httpError(
        response.status >= 400 ? response.status : 502,
        body?.error ?? body?.message ?? "VdoHide import failed"
      )

    const externalId = String(body.data.id)
    const externalSlug = body.data.slug ? String(body.data.slug) : undefined
    const playerBaseUrl = process.env.VDOHIDE_PLAYER_URL?.trim().replace(
      /\/$/,
      ""
    )
    const url =
      playerBaseUrl && externalSlug
        ? `${playerBaseUrl}/embed/${encodeURIComponent(externalSlug)}`
        : sourceUrl
    const key = `vdohide/${externalSlug ?? externalId}`

    mediaRecord.externalId = externalId
    mediaRecord.externalSlug = externalSlug
    mediaRecord.url = url
    mediaRecord.key = key
    mediaRecord.mimeType = "application/vnd.apple.mpegurl"
    mediaRecord.metadata = new Map<string, unknown>([
      ["name", body.data.name],
      ["cloned", Boolean(body.cloned)],
    ])
    await mediaRecord.save()

    return {
      id,
      url,
      key,
      externalId,
      provider: "vdohide" as const,
      status: "processing" as const,
      purpose,
      kind: "video" as const,
      mimeType: "application/vnd.apple.mpegurl",
      size: 0,
    }
  } catch (error) {
    mediaRecord.status = "failed"
    mediaRecord.error =
      error instanceof Error ? error.message : "VdoHide import failed"
    await mediaRecord.save().catch(() => undefined)
    throw error
  }
}

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status })
}

function inferVideoMimeType(url: string) {
  const pathname = new URL(url).pathname.toLowerCase()
  if (pathname.endsWith(".m3u8")) return "application/vnd.apple.mpegurl"
  if (pathname.endsWith(".webm")) return "video/webm"
  if (pathname.endsWith(".mov")) return "video/quicktime"
  return "video/mp4"
}
