import { notFound } from "next/navigation"
import type { Locale } from "@workspace/i18n/config"

import { createPageMetadata } from "@/i18n/metadata"
import { WatchExperience } from "@/components/watch/watch-experience"
import { getPlaylist, getVideo, getWatchData } from "@workspace/services/queries/video"

type VideoPageProps = {
  params: Promise<{ locale: Locale; videoId: string }>
  searchParams: Promise<{ list?: string | string[] }>
}

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: VideoPageProps) {
  const { locale, videoId } = await params
  const video = await getVideo(videoId).catch(() => null)

  if (!video) return {}

  return createPageMetadata({
    locale,
    pathname: `/watch/${videoId}`,
    title: video.title,
    description: video.description,
  })
}

export default async function VideoPage({ params, searchParams }: VideoPageProps) {
  const [{ locale, videoId }, query] = await Promise.all([params, searchParams])
  const listId = Array.isArray(query.list) ? query.list[0] : query.list
  const [data, playlist] = await Promise.all([getWatchData(videoId).catch(() => null), listId ? getPlaylist(listId).catch(() => null) : null])
  if (!data) notFound()
  return <WatchExperience key={data.video.id} data={data} locale={locale} playlist={playlist}/>
}
