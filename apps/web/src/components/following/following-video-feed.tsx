"use client"

import type { CursorPage, Video } from "@workspace/core/types"
import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { VideoGrid } from "@/components/video"
import { useCursorPage } from "@/hooks/use-cursor-page"

export function FollowingVideoFeed({ initialPage }: { initialPage: CursorPage<Video> }) {
  const locale = useLocale()
  const t = useTranslations("video")
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const { items, hasMore, loading, error, loadMore } = useCursorPage<Video>({ endpoint: "/api/v1/following/feed", initialItems: initialPage.items, initialNextCursor: initialPage.nextCursor })
  React.useEffect(() => { const sentinel = sentinelRef.current; if (!sentinel || !hasMore || loading || error) return; const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) void loadMore() }, { rootMargin: "500px 0px" }); observer.observe(sentinel); return () => observer.disconnect() }, [error, hasMore, loadMore, loading])
  const labels = { views: (count: string) => t("views", { count }), published: (date: string) => t("published", { date }), moreOptions: t("moreOptions"), verified: t("verified") }
  return <section className="border-t pt-7" aria-labelledby="following-videos"><h2 id="following-videos" className="mb-5 text-xl font-bold">{t("following.videos")}</h2>{items.length ? <VideoGrid videos={items} locale={locale} labels={labels} /> : <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">{t("following.emptyVideos")}</p>}<div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-6 text-sm text-muted-foreground" aria-live="polite">{loading ? <span className="inline-flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />{t("loadingMore")}</span> : null}{error ? <button type="button" onClick={() => void loadMore()} className="rounded-full border px-5 py-2 font-semibold text-foreground hover:bg-muted">{t("retry")}</button> : null}{!hasMore && items.length ? t("allLoaded") : null}</div></section>
}
