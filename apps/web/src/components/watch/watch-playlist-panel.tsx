"use client"

import * as React from "react"
import type { Playlist } from "@workspace/core/types"
import { ListVideo, Play, X } from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { Link } from "@/i18n/navigation"

export function WatchPlaylistPanel({
  playlist,
  activeVideoId,
}: {
  playlist: Playlist
  activeVideoId: string
}) {
  const t = useTranslations("video.home")
  const [visible, setVisible] = React.useState(true)
  if (!visible) return null
  const activeIndex = Math.max(
    0,
    playlist.items.findIndex((video) => video.id === activeVideoId)
  )
  return (
    <section
      aria-label={t("playlistLabel", { title: playlist.title })}
      className="mb-6 overflow-hidden rounded-2xl border bg-background"
    >
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <ListVideo className="mt-1 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-black">{playlist.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {playlist.owner} • {activeIndex + 1} / {playlist.items.length}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("closePlaylist")}
          onClick={() => setVisible(false)}
          className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="max-h-[360px] overflow-y-auto py-1 [scrollbar-width:thin] xl:max-h-[520px]">
        {playlist.items.map((video, index) => {
          const active = video.id === activeVideoId
          return (
            <Link
              key={video.id}
              href={`/watch/${video.id}?list=${encodeURIComponent(playlist.id)}&index=${index + 1}`}
              aria-current={active ? "true" : undefined}
              className={`grid grid-cols-[18px_112px_minmax(0,1fr)] items-center gap-2 px-2 py-2 transition-colors hover:bg-muted ${active ? "bg-primary/10" : ""}`}
            >
              <span className="flex justify-center text-muted-foreground">
                {active ? (
                  <Play className="size-3.5 fill-current text-primary" />
                ) : (
                  <span className="text-[10px] font-semibold">{index + 1}</span>
                )}
              </span>
              <span className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <Image
                  src={video.thumbnailUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="112px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 text-xs leading-4 font-bold">
                  {video.title}
                </span>
                {video.channel ? (
                  <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                    {video.channel.name}
                  </span>
                ) : null}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
