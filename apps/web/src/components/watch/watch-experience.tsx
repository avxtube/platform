/* eslint-disable @next/next/no-img-element */
"use client"

import type { Playlist, WatchData } from "@workspace/core/types"
import { BadgeCheck, MessageCircle, X } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { FollowActorButton } from "@/components/actor/follow-actor-button"
import { Link } from "@/i18n/navigation"
import { useRelatedVideos } from "@/hooks/use-related-videos"

import { VideoActions } from "./video-actions"
import { WatchComments } from "./watch-comments"
import { WatchPlayer } from "./watch-player"
import { WatchPlaylistPanel } from "./watch-playlist-panel"

export function WatchExperience({
  data,
  locale,
  playlist,
}: {
  data: WatchData
  locale: string
  playlist?: Playlist | null
}) {
  const t = useTranslations("video")
  const [theater, setTheater] = React.useState(false)
  const [autoplay, setAutoplay] = React.useState(true)
  const [mobileCommentsOpen, setMobileCommentsOpen] = React.useState(false)
  const toggleTheater = React.useCallback(
    () => setTheater((value) => !value),
    []
  )
  const { video } = data
  const related = useRelatedVideos(
    video.id,
    data.relatedVideos,
    data.relatedNextCursor
  )
  const views = Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(video.viewCount)
  const published = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(video.publishedAt))
  const channelHref = `/channel/${video.channel.handle.replace(/^@/, "")}`
  const playlistIndex = playlist
    ? Math.max(
        0,
        playlist.items.findIndex((item) => item.id === video.id)
      ) + 1
    : null

  const player = (
    <div className="sticky top-[var(--watch-player-top,4rem)] z-30 transition-[top] duration-200 lg:static">
      <WatchPlayer
        video={video}
        theater={theater}
        onTheater={toggleTheater}
        playlist={
          playlist && playlistIndex
            ? { id: playlist.id, index: playlistIndex }
            : null
        }
      />
    </div>
  )
  const details = (
    <div className="px-3 sm:px-0">
      <h1 className="mt-4 line-clamp-2 text-lg font-bold tracking-tight sm:text-2xl">
        {video.title}
      </h1>
      <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <Link
            href={channelHref}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background sm:size-11"
          >
            {initials(video.channel.name)}
          </Link>
          <div className="min-w-0">
            <Link
              href={channelHref}
              className="flex items-center gap-1 font-semibold hover:text-primary"
            >
              <span className="truncate">{video.channel.name}</span>
              {video.channel.verified ? (
                <BadgeCheck className="size-4 shrink-0" />
              ) : null}
            </Link>
            <p className="text-xs text-muted-foreground">
              {video.channel.handle}
            </p>
          </div>
          <FollowActorButton />
        </div>
        <VideoActions video={video} locale={locale} />
      </div>
      <div className="mt-5 rounded-xl bg-muted/60 p-4">
        <p className="font-semibold">
          {t("views", { count: views })} • {published}
        </p>
        <p className="mt-3 line-clamp-3 text-sm leading-6 whitespace-pre-line">
          {video.description}
        </p>
        <button type="button" className="mt-2 text-sm font-semibold">
          {t("showMore")}
        </button>
      </div>
      <button type="button" onClick={() => setMobileCommentsOpen(true)} className="mt-4 flex w-full items-center justify-between rounded-xl bg-muted/60 p-4 text-left sm:hidden"><span><strong>{t("comments", { count: data.comments.length })}</strong><span className="mt-1 block text-xs text-muted-foreground">{data.comments[0]?.message}</span></span><MessageCircle className="size-5 shrink-0" /></button>
      <div className="hidden sm:block"><WatchComments videoId={video.id} initialComments={data.comments} initialNextCursor={data.commentsNextCursor} locale={locale} /></div>
      {mobileCommentsOpen ? <div className="fixed inset-0 z-[80] bg-black/55 sm:hidden" onClick={() => setMobileCommentsOpen(false)}><section role="dialog" aria-modal="true" aria-label={t("comments", { count: data.comments.length })} onClick={(event) => event.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[80svh] overflow-y-auto rounded-t-2xl bg-background p-4 text-foreground"><div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" /><button type="button" onClick={() => setMobileCommentsOpen(false)} aria-label={t("shorts.close")} className="absolute top-3 right-3 rounded-full p-2 hover:bg-muted"><X className="size-5" /></button><WatchComments videoId={video.id} initialComments={data.comments} initialNextCursor={data.commentsNextCursor} locale={locale} /></section></div> : null}
    </div>
  )
  const next = (
    <aside className="min-w-0">
      {playlist ? (
        <WatchPlaylistPanel playlist={playlist} activeVideoId={video.id} />
      ) : null}
      <div className="mb-3 flex gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] sm:px-0 xl:hidden">
        {["all", "creators", "music", "technology"].map((category) => (
          <button
            key={category}
            type="button"
            className="shrink-0 rounded-lg bg-muted px-4 py-2 text-sm font-semibold first:bg-foreground first:text-background"
          >
            {t(`home.categories.${category}`)}
          </button>
        ))}
      </div>
      <div className="mb-4 hidden items-center justify-between xl:flex">
        <h2 className="text-lg font-bold">{t("upNext")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <span>{t("autoplay")}</span>
          <input
            type="checkbox"
            checked={autoplay}
            onChange={(event) => setAutoplay(event.target.checked)}
          />
        </label>
      </div>
      <div className="divide-y sm:space-y-4 sm:divide-y-0">
        {related.items.map((item) => (
          <Link
            key={item.id}
            href={`/watch/${item.id}`}
            className="group block bg-background sm:flex sm:gap-3"
          >
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted sm:w-40 sm:rounded-lg">
              <img
                src={item.thumbnailUrl}
                alt=""
                className="size-full object-cover transition-transform group-hover:scale-105"
              />
              <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                {formatDuration(item.durationSeconds)}
              </span>
            </div>
            <div className="min-w-0 p-3 sm:p-0">
              <h3 className="line-clamp-2 text-sm font-semibold">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.channel.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("views", {
                  count: Intl.NumberFormat(locale, {
                    notation: "compact",
                  }).format(item.viewCount),
                })}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {related.hasMore ? (
        <button
          type="button"
          disabled={related.loading}
          onClick={() => void related.loadMore()}
          className="mx-3 mt-5 w-[calc(100%-1.5rem)] rounded-full bg-muted px-4 py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-60 sm:mx-0 sm:w-full"
        >
          {t(
            related.loading
              ? "loadingMore"
              : related.error
                ? "retry"
                : "loadMore"
          )}
        </button>
      ) : (
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {t("allLoaded")}
        </p>
      )}
    </aside>
  )

  if (theater)
    return (
      <div className="space-y-7">
        {player}
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          {details}
          {next}
        </div>
      </div>
    )
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-6">
      <div className="contents xl:block">
        {player}
        {details}
      </div>
      {next}
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
}
function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${minutes}:${String(rest).padStart(2, "0")}`
}
