/* eslint-disable @next/next/no-img-element */
"use client"

import type { Video } from "@workspace/core/types"
import * as React from "react"

import { Link } from "@/i18n/navigation"

export function VideoListCard({
  video,
  viewsLabel,
  action,
}: {
  video: Video
  viewsLabel: string
  action?: React.ReactNode
}) {
  const previewRef = React.useRef<HTMLVideoElement>(null)
  const [previewActive, setPreviewActive] = React.useState(false)
  const [previewPlaying, setPreviewPlaying] = React.useState(false)
  const [previewFailed, setPreviewFailed] = React.useState(false)
  const canPreview = Boolean(video.previewUrl) && !previewFailed

  React.useEffect(() => {
    const player = previewRef.current
    if (!player) return
    if (!previewActive) {
      player.pause()
      player.currentTime = 0
      return
    }
    player.currentTime = 0
    void player.play().catch(() => setPreviewPlaying(false))
  }, [previewActive])

  return (
    <article
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && canPreview) setPreviewActive(true)
      }}
      onPointerLeave={() => {
        setPreviewPlaying(false)
        setPreviewActive(false)
      }}
      className="group block bg-background sm:flex sm:gap-3"
    >
      <Link
        href={`/watch/${video.id}`}
        aria-label={video.title}
        className="relative block aspect-video w-full shrink-0 overflow-hidden bg-muted sm:w-40 sm:rounded-lg"
      >
        <img
          src={video.thumbnailUrl || undefined}
          alt=""
          loading="lazy"
          className={`size-full object-cover transition-[transform,opacity] duration-200 group-hover:scale-105 ${previewPlaying ? "opacity-0" : "opacity-100"}`}
        />
        {canPreview ? (
          <video
            ref={previewRef}
            src={video.previewUrl}
            muted
            loop
            playsInline
            preload="none"
            poster={video.thumbnailUrl}
            aria-hidden="true"
            onPlaying={() => setPreviewPlaying(true)}
            onError={() => {
              setPreviewFailed(true)
              setPreviewActive(false)
              setPreviewPlaying(false)
            }}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ${previewPlaying ? "opacity-100" : "opacity-0"}`}
          />
        ) : null}
        <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">
          {formatDuration(video.durationSeconds)}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 items-start gap-2 p-3 sm:p-0">
        <div className="min-w-0 flex-1">
          <Link href={`/watch/${video.id}`}>
            <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">
              {video.title}
            </h3>
          </Link>
          {video.channel ? (
            <Link
              href={`/channel/${video.channel.handle.replace(/^@/, "")}`}
              className="mt-1 block truncate text-xs text-muted-foreground hover:text-foreground"
            >
              {video.channel.name}
            </Link>
          ) : null}
          <p className="text-xs text-muted-foreground">{viewsLabel}</p>
        </div>
        {action}
      </div>
    </article>
  )
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(
    0,
    Math.floor(Number.isFinite(seconds) ? seconds : 0)
  )
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const rest = totalSeconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${minutes}:${String(rest).padStart(2, "0")}`
}
