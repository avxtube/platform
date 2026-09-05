import { notFound } from "next/navigation"
import { getShort, getShortsPage } from "@workspace/services/queries/video"
import type { ShortsPageResponse } from "@workspace/core/types"
import type { Locale } from "@workspace/i18n/config"
import { cache } from "react"

import { ShortsViewer } from "@/components/shorts/shorts-viewer"
import {
  createPageMetadata,
  localizedPageUrl,
  serializeJsonLd,
} from "@/i18n/metadata"
import { videoStructuredData } from "@/lib/structured-data"

export const dynamic = "force-dynamic"

const getShortPageData = cache((videoId: string) => getShort(videoId))

type ShortPageProps = {
  params: Promise<{ locale: Locale; videoId: string }>
}

export async function generateMetadata({ params }: ShortPageProps) {
  const { locale, videoId } = await params
  const short = await getShortPageData(videoId).catch(() => null)
  if (!short) return {}
  return createPageMetadata({
    locale,
    pathname: `/shorts/${videoId}`,
    title: short.title,
    description: short.description,
    image: short.thumbnailUrl,
    video: short.previewUrl,
    openGraphType: "video.other",
  })
}

export default async function ShortPage({ params }: ShortPageProps) {
  const { locale, videoId } = await params
  const [requested, page] = await Promise.all([
    getShortPageData(videoId),
    getShortsPage(1, 5),
  ])
  if (!requested || requested.category !== "Shorts") notFound()
  const items = page.items.some((item) => item.id === requested.id)
    ? page.items
    : [requested, ...page.items]
  const initialPage: ShortsPageResponse = {
    ...page,
    items,
    pageSize: items.length,
  }
  const pageUrl = localizedPageUrl(locale, `/shorts/${videoId}`)
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(videoStructuredData(requested, pageUrl)),
        }}
      />
      <ShortsViewer
        initialPage={initialPage}
        initialVideoId={requested.id}
        locale={locale}
      />
    </>
  )
}
