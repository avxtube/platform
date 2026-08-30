/* eslint-disable @next/next/no-img-element */
"use client"

import * as React from "react"
import type { Playlist, WatchData } from "@workspace/core/types"
import { BadgeCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { FollowActorButton } from "@/components/actor/follow-actor-button"
import { Link } from "@/i18n/navigation"
import { useRelatedVideos } from "@/hooks/use-related-videos"
import { VideoActions } from "./video-actions"
import { WatchComments } from "./watch-comments"
import { WatchPlayer } from "./watch-player"
import { WatchPlaylistPanel } from "./watch-playlist-panel"

export function WatchExperience({ data, locale, playlist }: { data: WatchData; locale: string; playlist?: Playlist | null }) {
  const t = useTranslations("video")
  const [theater, setTheater] = React.useState(false)
  const [autoplay, setAutoplay] = React.useState(true)
  const toggleTheater = React.useCallback(() => setTheater((value) => !value), [])
  const { video } = data
  const related = useRelatedVideos(video.id, data.relatedVideos, data.relatedNextCursor)
  const views = Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(video.viewCount)
  const published = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(video.publishedAt))
  const actorHref = `/actors/${video.channel.handle.replace(/^@/, "")}`
  const playlistIndex = playlist ? Math.max(0, playlist.items.findIndex((item) => item.id === video.id)) + 1 : null

  const player = <WatchPlayer video={video} theater={theater} onTheater={toggleTheater} playlist={playlist && playlistIndex ? { id: playlist.id, index: playlistIndex } : null} />
  const details = <div><h1 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">{video.title}</h1><div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="flex items-center gap-3"><Link href={actorHref} className="flex size-11 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">{video.channel.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2)}</Link><div><Link href={actorHref} className="flex items-center gap-1 font-semibold hover:text-primary">{video.channel.name}{video.channel.verified ? <BadgeCheck className="size-4" /> : null}</Link><p className="text-xs text-muted-foreground">{video.channel.handle}</p></div><FollowActorButton /></div><VideoActions video={video} locale={locale} /></div><div className="mt-5 rounded-xl bg-muted/60 p-4"><p className="font-semibold">{t("views", { count: views })} • {published}</p><p className="mt-3 whitespace-pre-line text-sm leading-6">{video.description}</p><button type="button" className="mt-2 text-sm font-semibold">{t("showMore")}</button></div><WatchComments videoId={video.id} initialComments={data.comments} initialNextCursor={data.commentsNextCursor} locale={locale} /></div>
  const next = <aside>{playlist ? <WatchPlaylistPanel playlist={playlist} activeVideoId={video.id}/> : null}<div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{t("upNext")}</h2><label className="flex items-center gap-2 text-sm"><span>{t("autoplay")}</span><input type="checkbox" checked={autoplay} onChange={(event) => setAutoplay(event.target.checked)} /></label></div><div className="space-y-4">{related.items.map((item) => <Link key={item.id} href={`/watch/${item.id}`} className="group flex gap-3"><div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-muted"><img src={item.thumbnailUrl} alt="" className="size-full object-cover transition-transform group-hover:scale-105" /></div><div className="min-w-0"><h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.channel.name}</p><p className="text-xs text-muted-foreground">{t("views", { count: Intl.NumberFormat(locale, { notation: "compact" }).format(item.viewCount) })}</p></div></Link>)}</div>{related.hasMore ? <button type="button" disabled={related.loading} onClick={() => void related.loadMore()} className="mt-5 w-full rounded-full bg-muted px-4 py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-60">{t(related.loading ? "loadingMore" : related.error ? "retry" : "loadMore")}</button> : <p className="mt-5 text-center text-xs text-muted-foreground">{t("allLoaded")}</p>}</aside>

  if (theater) return <div className="space-y-7">{player}<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">{details}{next}</div></div>
  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]"><div>{player}{details}</div>{next}</div>
}
