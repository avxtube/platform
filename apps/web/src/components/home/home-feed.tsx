"use client"

import * as React from "react"
import type { HomeFeedResponse } from "@workspace/core/types"
import { Clapperboard } from "lucide-react"
import { useTranslations } from "next-intl"

import { VideoGrid } from "@/components/video"
import { CategoryChips } from "./category-chips"
import { PlaylistShelf } from "./playlist-shelf"
import { SectionHeading } from "./section-heading"
import { ShortsShelf } from "./shorts-shelf"

const categoryKeys: Record<string, string> = {
  Travel: "travel", Food: "food", Technology: "technology", Creators: "creators",
  Music: "music", Education: "education", Fitness: "fitness", Lifestyle: "lifestyle",
  Science: "science", Adventure: "adventure",
}

export function HomeFeed({ videos, shorts, playlists, locale }: HomeFeedResponse & { locale: string }) {
  const t = useTranslations("video")
  const home = useTranslations("video.home")
  const [activeCategory, setActiveCategory] = React.useState("all")
  const categories = React.useMemo(() => [{ value: "all", label: home("categories.all") }, ...Array.from(new Set(videos.map((video) => video.category))).map((category) => ({ value: category, label: categoryKeys[category] ? home(`categories.${categoryKeys[category]}`) : category }))], [home, videos])
  const filtered = activeCategory === "all" ? videos : videos.filter((video) => video.category === activeCategory)
  const labels = { views: (count: string) => t("views", { count }), published: (date: string) => t("published", { date }), moreOptions: t("moreOptions"), verified: t("verified") }
  const hasContent = videos.length || shorts.length || playlists.length
  return <>
    <div className="sticky top-16 z-20 -mt-4 bg-background/95 pt-4 pb-2 backdrop-blur-xl"><CategoryChips categories={categories} active={activeCategory} onChange={setActiveCategory}/></div>
    {filtered.length ? <section className="mt-4"><VideoGrid videos={filtered.slice(0, 12)} locale={locale} labels={labels}/></section> : activeCategory !== "all" ? <div className="rounded-xl border border-dashed px-6 py-16 text-center"><p className="font-medium">{home("noCategoryTitle")}</p><p className="mt-1 text-sm text-muted-foreground">{home("noCategoryDescription")}</p></div> : null}
    {activeCategory === "all" ? <>{playlists.length ? <PlaylistShelf playlists={playlists}/> : null}{shorts.length ? <ShortsShelf shorts={shorts}/> : null}{videos.length > 12 ? <section className="mt-9 border-t pt-7"><SectionHeading title={home("latestVideos")} href="/trending" actionLabel={home("viewAll")}/><VideoGrid videos={videos.slice(12, 24)} locale={locale} labels={labels} className="2xl:grid-cols-3"/></section> : null}</> : null}
    {!hasContent ? <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center"><span className="mb-5 grid size-20 place-items-center rounded-full bg-muted"><Clapperboard className="size-9 text-muted-foreground"/></span><h1 className="text-xl font-bold">{home("emptyTitle")}</h1><p className="mt-2 max-w-md text-sm text-muted-foreground">{home("emptyDescription")}</p></div> : null}
  </>
}
