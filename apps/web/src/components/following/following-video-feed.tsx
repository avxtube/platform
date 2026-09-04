"use client"

import type { CursorPage, Video } from "@workspace/core/types"
import { useLocale, useTranslations } from "next-intl"
import { VideoGrid } from "@/components/video"

export function FollowingVideoFeed({ initialPage }: { initialPage: CursorPage<Video> }) {
  const locale = useLocale()
  const t = useTranslations("video")
  const items = initialPage.items.slice(0, 20)
  const labels = { views: (count: string) => t("views", { count }), published: (date: string) => t("published", { date }), moreOptions: t("moreOptions"), verified: t("verified") }
  return <section className="border-t pt-7" aria-labelledby="following-videos"><h2 id="following-videos" className="mb-5 text-xl font-bold">{t("following.videos")}</h2>{items.length ? <VideoGrid videos={items} locale={locale} labels={labels} /> : <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">{t("following.emptyVideos")}</p>}</section>
}
