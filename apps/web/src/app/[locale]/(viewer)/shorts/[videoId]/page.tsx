import { notFound } from "next/navigation"
import { getShort, getShortsPage } from "@workspace/services/queries/video"
import type { ShortsPageResponse } from "@workspace/core/types"

import { ShortsViewer } from "@/components/shorts/shorts-viewer"

export const dynamic = "force-dynamic"

export default async function ShortPage({ params }: { params: Promise<{ locale: string; videoId: string }> }) {
  const { locale, videoId } = await params
  const [requested, page] = await Promise.all([getShort(videoId), getShortsPage(1, 5)])
  if (!requested || requested.category !== "Shorts") notFound()
  const items = page.items.some((item) => item.id === requested.id) ? page.items : [requested, ...page.items]
  const initialPage: ShortsPageResponse = { ...page, items, pageSize: items.length }
  return <ShortsViewer initialPage={initialPage} initialVideoId={requested.id} locale={locale} />
}
