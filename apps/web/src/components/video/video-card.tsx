import type { Video } from "@workspace/core/types"
import { BadgeCheck, EllipsisVertical, Play } from "lucide-react"

import { Link } from "@/i18n/navigation"

type VideoCardProps = {
  video: Video
  href: string
  viewsLabel: string
  publishedLabel: string
  moreOptionsLabel: string
  verifiedLabel: string
  hideAvatar?: boolean
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function VideoCard({
  video,
  href,
  viewsLabel,
  publishedLabel,
  moreOptionsLabel,
  verifiedLabel,
  hideAvatar = false,
}: VideoCardProps) {
  return (
    <article className="group min-w-0">
      <Link href={href} aria-label={video.title} className="block">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
          {/* Mock API thumbnails are remote URLs, so the native element avoids coupling API data to next/image domains. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
            {video.category}
          </span>
          <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
            <Play className="ml-0.5 size-4 fill-current" />
          </span>
          <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        </div>
      </Link>

      <div className="mt-3 flex gap-3">
        {!hideAvatar ? <Link href={`/channel/${video.channel.handle.replace(/^@/, "")}`} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">{getInitials(video.channel.name)}</Link> : null}
        <div className="min-w-0 flex-1">
          <Link href={href}>
            <h2 className="line-clamp-2 text-sm leading-5 font-semibold tracking-[-0.01em] group-hover:text-primary">
              {video.title}
            </h2>
          </Link>
          <Link href={`/channel/${video.channel.handle.replace(/^@/, "")}`} className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <span className="truncate">{video.channel.name}</span>
            {video.channel.verified ? (
              <BadgeCheck className="size-3.5 shrink-0" aria-label={verifiedLabel} />
            ) : null}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {viewsLabel} • {publishedLabel}
          </p>
        </div>
        <button
          type="button"
          aria-label={moreOptionsLabel}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100"
        >
          <EllipsisVertical className="size-4" />
        </button>
      </div>
    </article>
  )
}
