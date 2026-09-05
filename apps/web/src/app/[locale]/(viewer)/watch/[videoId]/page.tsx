import { notFound } from "next/navigation"
import { cache } from "react"
import type { Locale } from "@workspace/i18n/config"

import {
  createPageMetadata,
  localizedPageUrl,
  serializeJsonLd,
} from "@/i18n/metadata"
import { videoStructuredData } from "@/lib/structured-data"
import { WatchExperience } from "@/components/watch/watch-experience"
import { getPlaylist, getWatchData } from "@workspace/services/queries/video"

type VideoPageProps = {
  params: Promise<{ locale: Locale; videoId: string }>
  searchParams: Promise<{ list?: string | string[] }>
}

export const dynamic = "force-dynamic"

const getWatchPageData = cache((videoId: string, locale: Locale) =>
  getWatchData(videoId, locale)
)

export async function generateMetadata({ params }: VideoPageProps) {
  const { locale, videoId } = await params
  const data = await getWatchPageData(videoId, locale).catch(() => null)

  if (!data) return {}

  return createPageMetadata({
    locale,
    pathname: `/watch/${videoId}`,
    title: data.video.title,
    description: data.video.description,
    image: data.video.thumbnailUrl,
    video: data.video.previewUrl,
    openGraphType: "video.other",
  })
}

export default async function VideoPage({
  params,
  searchParams,
}: VideoPageProps) {
  const [{ locale, videoId }, query] = await Promise.all([params, searchParams])
  const listId = Array.isArray(query.list) ? query.list[0] : query.list
  const [data, playlist] = await Promise.all([
    getWatchPageData(videoId, locale).catch(() => null),
    listId ? getPlaylist(listId).catch(() => null) : null,
  ])
  if (!data) notFound()
  const pageUrl = localizedPageUrl(locale, `/watch/${videoId}`)
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(videoStructuredData(data.video, pageUrl)),
        }}
      />
      <WatchExperience
        key={data.video.id}
        data={data}
        locale={locale}
        playlist={playlist}
      />
    </>
  )
}
