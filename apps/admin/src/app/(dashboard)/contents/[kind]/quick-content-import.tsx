"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import {
  prepareMissavMediaImport,
  registerImportedMissavMedia,
} from "@/lib/missav-media-import"

import {
  ContentImport,
  importedNames,
  type ImportedVideoData,
  type VideoImportResult,
} from "@/components/content-import"
import { withImportUrlCategories } from "@/lib/content-editor"
import { fetchImportedTranslations } from "@/lib/video-translations"

type UploadedMedia = { url: string }
type ResolvedItem = { key: string; id: string }

export function QuickContentImport({
  translationLocales,
}: {
  translationLocales: readonly string[]
}) {
  const t = useTranslations("admin")
  const router = useRouter()

  async function saveImportedVideo(result: VideoImportResult) {
    const data = result.data
    const remoteImport = prepareMissavMediaImport(result)
    const sourcePageUrl = cleanImportedUrl(
      remoteImport?.sourcePageUrl ?? data.sourceUrl ?? result.url ?? ""
    )
    const sourceVideoUrl =
      remoteImport?.assets.find((asset) => asset.purpose === "video")
        ?.sourceUrl ?? cleanImportedUrl(data.m3u8Url ?? "")
    const slug = toSlug(data.slug || data.code || data.title || "")
    const translated =
      remoteImport && sourcePageUrl
        ? await fetchImportedTranslations(sourcePageUrl, translationLocales)
        : {}

    // External media must finish before relation records may be created.
    const [video, poster, trailer] = remoteImport
      ? [
          sourceVideoUrl ? { url: sourceVideoUrl } : undefined,
          data.poster ? { url: cleanImportedUrl(data.poster) } : undefined,
          data.trailer ? { url: cleanImportedUrl(data.trailer) } : undefined,
        ]
      : await Promise.all([
          sourcePageUrl || sourceVideoUrl
            ? importVdoHide(sourcePageUrl || sourceVideoUrl, sourceVideoUrl)
            : undefined,
          data.poster
            ? importMediaUrl({
                purpose: "poster",
                url: cleanImportedUrl(data.poster),
                referrerUrl: sourcePageUrl,
                keySlug: slug,
                imageMode: "fit",
              })
            : undefined,
          data.trailer
            ? importMediaUrl({
                purpose: "trailer",
                url: cleanImportedUrl(data.trailer),
                referrerUrl: sourcePageUrl || "https://missav.ai/",
                keySlug: slug,
              })
            : undefined,
        ])

    // Register all remote descriptors before creating studios, actors or terms.
    const remoteMetadata = remoteImport
      ? await registerImportedMissavMedia(
          {
            ...(video ? { sourceUrl: video.url } : {}),
            ...(poster ? { thumbnailUrl: poster.url } : {}),
            ...(trailer ? { trailerUrl: trailer.url } : {}),
          },
          remoteImport
        )
      : {}

    const studios = importedNames(data.makers)
    const actresses = importedNames(data.actresses)
    const actors = importedNames(data.actors)
    const categories = withImportUrlCategories(importedNames(data.genres), [
      result.url,
      data.sourceUrl,
      sourcePageUrl,
    ])
    const tags = importedNames(data.tags)
    const labels = importedNames(data.labels)
    const series = importedNames(data.series)
    const directors = importedNames(data.directors)
    const channels = [
      ...studios.map((name, index) => ({
        key: `studio:${index}`,
        kind: "studio" as const,
        name,
      })),
      ...actresses.map((name, index) => ({
        key: `actress:${index}`,
        kind: "actress" as const,
        name,
      })),
      ...actors.map((name, index) => ({
        key: `actor:${index}`,
        kind: "actor" as const,
        name,
      })),
      ...directors.map((name, index) => ({
        key: `director:${index}`,
        kind: "director" as const,
        name,
      })),
    ]
    const terms = [
      ...categories.map((name, index) => ({
        key: `category:${index}`,
        taxonomy: "category" as const,
        name,
      })),
      ...tags.map((name, index) => ({
        key: `tag:${index}`,
        taxonomy: "tag" as const,
        name,
      })),
      ...labels.map((name, index) => ({
        key: `label:${index}`,
        taxonomy: "label" as const,
        name,
      })),
      ...series.map((name, index) => ({
        key: `series:${index}`,
        taxonomy: "series" as const,
        name,
      })),
    ]

    const [resolvedChannels, resolvedTerms] = await Promise.all([
      channels.length
        ? resolveItems("/api/v1/admin/channels/resolve", "channels", channels)
        : [],
      terms.length
        ? resolveItems("/api/v1/admin/terms/resolve", "terms", terms)
        : [],
    ])
    const channelIds = new Map(
      resolvedChannels.map((item) => [item.key, item.id])
    )
    const termIds = new Map(resolvedTerms.map((item) => [item.key, item.id]))
    if (
      channels.some((item) => !channelIds.has(item.key)) ||
      terms.some((item) => !termIds.has(item.key))
    ) {
      throw new Error(t("metadataRelationCreateFailed"))
    }

    const metadata = createMetadata({
      data,
      result,
      sourcePageUrl,
      video,
      poster,
      trailer,
    })
    await requestJson("/api/v1/admin/contents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "video",
        title: nullable(data.title),
        slug: nullable(slug),
        description: nullable(data.content),
        translated,
        status: "published",
        visibility: "public",
        moderationStatus: "active",
        publishedAt: null,
        scheduledAt: null,
        studioIds: studios.map(
          (_, index) => channelIds.get(`studio:${index}`)!
        ),
        actressIds: actresses.map(
          (_, index) => channelIds.get(`actress:${index}`)!
        ),
        actorIds: actors.map((_, index) => channelIds.get(`actor:${index}`)!),
        directorIds: directors.map(
          (_, index) => channelIds.get(`director:${index}`)!
        ),
        termIds: [
          ...categories.map((_, index) => termIds.get(`category:${index}`)!),
          ...tags.map((_, index) => termIds.get(`tag:${index}`)!),
          ...labels.map((_, index) => termIds.get(`label:${index}`)!),
          ...series.map((_, index) => termIds.get(`series:${index}`)!),
        ],
        metadata: {
          ...metadata,
          ...remoteMetadata,
          import: {
            ...metadata.import,
            ...(remoteImport
              ? { sourceProvider: "missav", mediaMode: "proxy" }
              : {}),
          },
        },
        seo: { metaTitle: null, metaDescription: null, keywords: [] },
      }),
    })
    router.refresh()
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
      <div>
        <h2 className="text-sm font-semibold">{t("quickImportTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("quickImportDescription")}
        </p>
      </div>
      <ContentImport
        onImported={saveImportedVideo}
        successMessage={t("quickImportSuccess")}
      />
    </section>
  )
}

function createMetadata({
  data,
  result,
  sourcePageUrl,
  video,
  poster,
  trailer,
}: {
  data: ImportedVideoData
  result: VideoImportResult
  sourcePageUrl: string
  video?: UploadedMedia
  poster?: UploadedMedia
  trailer?: UploadedMedia
}) {
  const country = importedNames(data.country)[0]
  return {
    ...(data.code ? { dvdId: data.code } : {}),
    ...(data.releaseDate ? { releaseDate: data.releaseDate } : {}),
    ...(country ? { country } : {}),
    ...(typeof data.duration === "number"
      ? { durationSeconds: data.duration }
      : {}),
    ...(video?.url ? { sourceUrl: video.url } : {}),
    ...(poster?.url ? { thumbnailUrl: poster.url } : {}),
    ...(trailer?.url ? { trailerUrl: trailer.url } : {}),
    import: {
      sourceUrl: sourcePageUrl,
      parser: result.parser ?? null,
      importedAt: result.timestamp ?? new Date().toISOString(),
    },
  }
}

async function importVdoHide(sourceUrl: string, fallbackUrl: string) {
  const body = await requestJson<{ media: UploadedMedia }>(
    "/api/v1/admin/media/import-vdohide",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        purpose: "video",
        url: sourceUrl,
        fallbackUrl: fallbackUrl || undefined,
      }),
    }
  )
  return body.media
}

async function importMediaUrl(input: {
  purpose: "poster" | "trailer"
  url: string
  referrerUrl?: string
  keySlug: string
  imageMode?: "fit"
}) {
  const body = await requestJson<{ media: UploadedMedia }>(
    "/api/v1/admin/media/import-url",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  return body.media
}

async function resolveItems<T extends object>(
  url: string,
  key: "channels" | "terms",
  items: T[]
) {
  const body = await requestJson<Record<string, ResolvedItem[]>>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ [key]: items }),
  })
  return body[key] ?? []
}

async function requestJson<T = unknown>(url: string, init: RequestInit) {
  const response = await fetch(url, init)
  const body = (await response.json().catch(() => null)) as
    | (T & { message?: string; error?: string })
    | null
  if (!response.ok || !body)
    throw new Error(
      body?.message ?? body?.error ?? `Request failed (${response.status})`
    )
  return body
}

function nullable(value?: string) {
  const result = value?.trim()
  return result || null
}

function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 300)
}

function cleanImportedUrl(value: string) {
  const trimmed = value.trim()
  const markdown = /^\[(https?:\/\/[^\]]+)\]\(https?:\/\/[^)]+\)$/.exec(trimmed)
  return markdown?.[1] ?? trimmed
}
