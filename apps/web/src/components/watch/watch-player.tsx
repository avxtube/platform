/* eslint-disable @next/next/no-img-element */
"use client"

import type { Video } from "@workspace/core/types"
import * as React from "react"

import { useWatchPlayer } from "./watch-player-provider"

const playerStylesheet = publicHttpUrl(
  process.env.NEXT_PUBLIC_PLAYER_STYLESHEET_URL,
  "https://asset-cdn.vdohide.com/player.bundle.min.css"
)
const playerScript = publicHttpUrl(
  process.env.NEXT_PUBLIC_PLAYER_SCRIPT_URL,
  process.env.NODE_ENV === "development"
    ? "https://asset-cdn.vdohide.com/player.min.js"
    : "https://asset-cdn.vdohide.com/player.min.js"
)
const jwPlayerScript = "https://ssl.p.jwpcdn.com/player/v/8.49.10/jwplayer.js"

type ExternalPlayerConfig = {
  dev: boolean
  vdoId: string
  node: { static: string; playlist: string }
  autostart: boolean
  mute: boolean
  pipIcon: "enabled"
  baseColor: string
  bgColor: string
  cast: boolean
  loop: boolean
  seek: {
    seconds: number
    indicator: boolean
    forward: boolean
    backward: boolean
  }
  playbackRate: boolean
  continuePlayBack: {
    enable: boolean
    ark: boolean
    autoResume: boolean
    countdown: number
  }
  sprite: boolean
  image: boolean
}

declare global {
  interface Window {
    PLAYER_CONFIG?: ExternalPlayerConfig
    jwplayer?: unknown
  }
}

function publicHttpUrl(value: string | undefined, fallback: string) {
  try {
    const url = new URL(value || fallback)
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : fallback
  } catch {
    return fallback
  }
}

function createPlayerConfig(video: Video): ExternalPlayerConfig | null {
  if (!video.player) return null
  return {
    dev: process.env.NODE_ENV === "development",
    vdoId: video.player.vdoId,
    node: video.player.node,
    autostart: false,
    mute: false,
    pipIcon: "enabled",
    baseColor: "#f90101",
    bgColor: "#000000",
    cast: true,
    loop: true,
    seek: {
      seconds: 30,
      indicator: true,
      forward: true,
      backward: true,
    },
    playbackRate: true,
    continuePlayBack: {
      enable: true,
      ark: false,
      autoResume: false,
      countdown: 20,
    },
    sprite: true,
    image: true,
  }
}

export function WatchPlayer({
  video,
  playlist,
}: {
  video: Video
  theater: boolean
  onTheater: () => void
  playlist?: { id: string; index: number } | null
}) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const watchPlayer = useWatchPlayer()
  const [loadState, setLoadState] = React.useState<
    "loading" | "ready" | "error"
  >("loading")
  const playlistId = playlist?.id
  const playlistIndex = playlist?.index
  const activate = watchPlayer.activate

  React.useEffect(
    () =>
      activate(
        video,
        playlistId && playlistIndex
          ? { id: playlistId, index: playlistIndex }
          : null
      ),
    [activate, playlistId, playlistIndex, video]
  )

  React.useEffect(() => {
    const config = createPlayerConfig(video)
    const root = rootRef.current
    if (!config || !root) return

    setLoadState("loading")
    window.PLAYER_CONFIG = config
    let cancelled = false
    let script: HTMLScriptElement | null = null
    let jwScript: HTMLScriptElement | null = null

    const loadPlayer = () => {
      if (cancelled) return
      script = document.createElement("script")
      script.src = playerScript
      script.async = true
      script.dataset.watchPlayer = config.vdoId
      script.addEventListener("load", () => setLoadState("ready"), {
        once: true,
      })
      script.addEventListener("error", () => setLoadState("error"), {
        once: true,
      })
      document.body.append(script)
    }

    if (typeof window.jwplayer === "function") {
      loadPlayer()
    } else {
      jwScript = document.createElement("script")
      jwScript.src = jwPlayerScript
      jwScript.async = true
      jwScript.addEventListener("load", loadPlayer, { once: true })
      jwScript.addEventListener("error", () => setLoadState("error"), {
        once: true,
      })
      document.body.append(jwScript)
    }

    return () => {
      cancelled = true
      script?.remove()
      jwScript?.remove()
      root.replaceChildren()
      if (window.PLAYER_CONFIG === config) delete window.PLAYER_CONFIG
    }
  }, [
    video,
    video.player?.node.playlist,
    video.player?.node.static,
    video.player?.vdoId,
  ])

  const configured = Boolean(video.player)
  return (
    <>
      <link
        rel="preconnect"
        href="https://ssl.p.jwpcdn.com"
        crossOrigin="anonymous"
      />
      <link rel="dns-prefetch" href="https://ssl.p.jwpcdn.com" />
      <link
        rel="preconnect"
        href="https://asset-cdn.vdohide.com"
        crossOrigin="anonymous"
      />
      <link rel="stylesheet" href={playerStylesheet} precedence="default" />
      <div className="relative aspect-video w-full overflow-hidden bg-black sm:rounded-xl">
        <div
          ref={rootRef}
          id="player"
          aria-label={video.title}
          className="absolute inset-0"
        />
        {configured && loadState !== "error" ? (
          loadState === "loading" ? (
            <div
              className="pointer-events-none absolute inset-0 grid place-items-center bg-black"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 240 240"
                className="size-12 animate-spin fill-white"
              >
                <path d="M120 186.667a66.667 66.667 0 010-133.333V40a80 80 0 1080 80h-13.333A66.846 66.846 0 01120 186.667z" />
              </svg>
            </div>
          ) : null
        ) : (
          <div className="absolute inset-0">
            <img
              src={video.thumbnailUrl || undefined}
              alt=""
              className="size-full object-cover"
            />
          </div>
        )}
      </div>
    </>
  )
}
