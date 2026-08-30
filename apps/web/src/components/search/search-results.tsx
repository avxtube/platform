/* eslint-disable @next/next/no-img-element */

import type { SearchResponse, Video } from "@workspace/core/types"
import type { Locale } from "@workspace/i18n/config"
import { BadgeCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { PlaylistShelf } from "@/components/home/playlist-shelf"
import { TrendingShortsCarousel } from "@/components/trending/trending-shorts-carousel"
import { Link } from "@/i18n/navigation"

export async function SearchResults({ result, query, locale }: { result: SearchResponse; query: string; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "video.search" })
  const empty = !result.videos.length && !result.shorts.length && !result.actors.length && !result.playlists.length

  return <div className="mt-2">{result.actors.length ? <section className="border-b py-6"><h2 className="mb-5 text-xl font-bold">{t("actors")}</h2><div className="flex gap-6 overflow-x-auto pb-3">{result.actors.map((actor) => <Link key={actor.id} href={`/channel/${actor.handle.replace(/^@/, "")}`} className="w-28 shrink-0 text-center"><img src={actor.coverUrl} alt="" className="mx-auto aspect-square w-24 rounded-full object-cover" /><span className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold"><span className="truncate">{actor.name}</span>{actor.verified ? <BadgeCheck className="size-3.5 shrink-0 text-primary" /> : null}</span></Link>)}</div></section> : null}{result.videos.length ? <section className="space-y-5 py-6"><h2 className="text-xl font-bold">{t("videos")}</h2>{result.videos.map((video) => <SearchVideoCard key={video.id} video={video} locale={locale} />)}</section> : null}{result.shorts.length ? <TrendingShortsCarousel shorts={result.shorts.slice(0, 15)} /> : null}{result.playlists.length ? <PlaylistShelf playlists={result.playlists} /> : null}{empty ? <div className="flex min-h-[42vh] flex-col items-center justify-center text-center"><h2 className="text-xl font-bold">{t("emptyTitle")}</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">{t("emptyDescription", { query })}</p></div> : null}</div>
}

function SearchVideoCard({ video, locale }: { video: Video; locale: Locale }) {
  const views = Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(video.viewCount)
  const published = Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(video.publishedAt))
  return <article className="group grid gap-4 sm:grid-cols-[minmax(260px,360px)_1fr]"><Link href={`/watch/${video.id}`} className="relative aspect-video overflow-hidden rounded-xl bg-muted"><img src={video.thumbnailUrl} alt="" className="size-full object-cover transition-transform group-hover:scale-[1.02]" /><span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">{formatDuration(video.durationSeconds)}</span></Link><div className="min-w-0 py-1"><Link href={`/watch/${video.id}`}><h3 className="line-clamp-2 text-lg font-bold group-hover:text-primary">{video.title}</h3></Link><p className="mt-1 text-xs text-muted-foreground">{views} • {published}</p><Link href={`/channel/${video.channel.handle.replace(/^@/, "")}`} className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><span className="grid size-7 place-items-center rounded-full bg-foreground text-[9px] font-bold text-background">{video.channel.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2)}</span>{video.channel.name}</Link><p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{video.description}</p></div></article>
}

function formatDuration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${minutes}:${String(rest).padStart(2, "0")}` }
