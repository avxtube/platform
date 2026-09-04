"use client"

import type { Video } from "@workspace/core/types"
import * as React from "react"

import { useWatchPlayer } from "./watch-player-provider"

export function WatchPlayer({
  video,
  playlist,
}: {
  video: Video
  theater: boolean
  onTheater: () => void
  playlist?: { id: string; index: number } | null
}) {
  const watchPlayer = useWatchPlayer()
  const playlistId = playlist?.id
  const playlistIndex = playlist?.index
  const activate = watchPlayer.activate
  const registerWatchHost = watchPlayer.registerWatchHost

  React.useLayoutEffect(
    () =>
      activate(
        video,
        playlistId && playlistIndex !== undefined
          ? { id: playlistId, index: playlistIndex }
          : null
      ),
    [activate, playlistId, playlistIndex, video]
  )

  return (
    <div
      ref={registerWatchHost}
      className="group relative aspect-video w-full overflow-hidden bg-black sm:rounded-xl"
      style={
        video.thumbnailUrl
          ? {
              backgroundImage: `url(${video.thumbnailUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    />
  )
}
