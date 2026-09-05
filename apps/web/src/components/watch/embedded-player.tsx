/* eslint-disable @next/next/no-img-element */
"use client"

import type { Video } from "@workspace/core/types"
import type { AdvertSettings } from "@workspace/core/validators"
import * as React from "react"

const devAssetVersion =
  process.env.NEXT_PUBLIC_PLAYER_ASSET_VERSION || Date.now().toString(36)

function versionPlayerAsset(url: string) {
  if (process.env.NODE_ENV !== "development") return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}devBuild=${encodeURIComponent(devAssetVersion)}`
}

const playerStylesheet = versionPlayerAsset(
  publicNetworkUrl(
    process.env.NEXT_PUBLIC_PLAYER_STYLESHEET_URL,
    "https://media.avxtube.com/assets/v1.0.0/player.bundle.min.css"
  )
)
const playerScript = versionPlayerAsset(
  publicNetworkUrl(
    process.env.NEXT_PUBLIC_PLAYER_SCRIPT_URL,
    "https://media.avxtube.com/assets/v1.0.0/player.min.js"
  )
)
const jwPlayerScript = "//ssl.p.jwpcdn.com/player/v/8.49.10/jwplayer.js"

export type PlayerPlaybackState = Partial<{
  currentTime: number
  isPlaying: boolean
  muted: boolean
  volume: number
  speed: number
  started: boolean
}>

type PlayerConfig = {
  dev: boolean
  vdoId: string
  title: string
  playerMode: "full" | "mini"
  node: { static: string; playlist: string }
  autostart: boolean
  mute: boolean
  pipIcon: "enabled"
  miniPlayer: { enabled: true; mode: "inline" }
  playbackState: PlayerPlaybackState
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
  image: boolean | string
  adverts?: AdvertSettings
}

type PlayerKit = {
  bootstrap: (options: { containerId: string; autoCleanup: boolean }) => void
  destroyPlayer: () => void
}

type PlayerHostBridge = {
  dispatch: (command: object) => boolean
  setMode: (
    mode: "full" | "mini",
    settings: {
      enabled: boolean
      mode: "inline" | "active"
      restoreLabel?: string
      closeLabel?: string
      muteLabel?: string
      unmuteLabel?: string
    }
  ) => boolean
}

type PlayerEventDetail = {
  source?: string
  type?: string
  videoId?: string | null
  sessionId?: string | null
  sequence?: number
  state?: PlayerPlaybackState
  action?: "restore" | "close"
}

declare global {
  interface Window {
    PLAYER_CONFIG?: PlayerConfig
    JWPlayerKit?: PlayerKit
    PlayerHostBridge?: PlayerHostBridge
    hplayInstance?: unknown
    __PLAYER_MANUAL_BOOTSTRAP__?: boolean
  }
}

let assetsPromise: Promise<void> | null = null

function publicNetworkUrl(value: string | undefined, fallback: string) {
  const candidate = value || fallback
  if (/^\/\/[^/]/.test(candidate)) return candidate
  try {
    const url = new URL(candidate)
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback
    return `//${url.host}${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

function pageNetworkUrl(value: string) {
  if (!value.startsWith("//")) return value
  return `${window.location.protocol}${value}`
}

function addStylesheet() {
  const existing = document.querySelector<HTMLLinkElement>(
    'link[data-avxtube-player="styles"]'
  )
  if (existing) {
    const expectedUrl = new URL(playerStylesheet, window.location.href).href
    if (existing.href !== expectedUrl) existing.href = playerStylesheet
    return
  }
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = playerStylesheet
  link.dataset.avxtubePlayer = "styles"
  document.head.append(link)
}

function loadScript(src: string, key: string) {
  let existing = document.querySelector<HTMLScriptElement>(
    `script[data-avxtube-player="${key}"]`
  )
  const expectedUrl = new URL(src, window.location.href).href
  if (existing && existing.src !== expectedUrl) {
    existing.remove()
    existing = null
  }
  if (existing?.dataset.loaded === "true") return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const script = existing || document.createElement("script")
    const loaded = () => {
      script.dataset.loaded = "true"
      resolve()
    }
    script.addEventListener("load", loaded, { once: true })
    script.addEventListener("error", reject, { once: true })
    if (!existing) {
      script.src = src
      script.dataset.avxtubePlayer = key
      document.body.append(script)
    }
  })
}

function ensureAssets(config: PlayerConfig) {
  addStylesheet()
  window.PLAYER_CONFIG = config
  window.__PLAYER_MANUAL_BOOTSTRAP__ = true
  const existingBundle = document.querySelector<HTMLScriptElement>(
    'script[data-avxtube-player="bundle"]'
  )
  const expectedBundleUrl = new URL(playerScript, window.location.href).href
  if (window.JWPlayerKit && existingBundle?.src === expectedBundleUrl) {
    return Promise.resolve()
  }
  if (existingBundle && existingBundle.src !== expectedBundleUrl) {
    window.JWPlayerKit?.destroyPlayer()
    existingBundle.remove()
    delete window.JWPlayerKit
    delete window.PlayerHostBridge
    delete window.hplayInstance
    assetsPromise = null
  }
  assetsPromise ??= loadScript(jwPlayerScript, "jw").then(() =>
    loadScript(playerScript, "bundle")
  )
  return assetsPromise
}

function createConfig(
  video: Video,
  playbackState: PlayerPlaybackState,
  adverts: AdvertSettings
): PlayerConfig | null {
  if (!video.player) return null
  return {
    dev: process.env.NODE_ENV === "development",
    vdoId: video.player.vdoId,
    title: video.title,
    playerMode: "full",
    node: {
      static: pageNetworkUrl(video.player.node.static),
      playlist: pageNetworkUrl(video.player.node.playlist),
    },
    autostart: playbackState.isPlaying === true,
    mute: playbackState.muted === true,
    pipIcon: "enabled",
    miniPlayer: { enabled: true, mode: "inline" },
    playbackState,
    baseColor: "#f90101",
    bgColor: "#000000",
    cast: true,
    loop: true,
    seek: { seconds: 30, indicator: true, forward: true, backward: true },
    playbackRate: true,
    continuePlayBack: {
      enable: playbackState.started !== true,
      ark: false,
      autoResume: false,
      countdown: 20,
    },
    sprite: true,
    image: video.thumbnailUrl ? pageNetworkUrl(video.thumbnailUrl) : true,
    adverts,
  }
}

function sendCommand(videoId: string | undefined, command: object) {
  if (window.PlayerHostBridge?.dispatch(command)) return
  window.postMessage(
    {
      source: "code-player-host",
      type: "player-command",
      videoId,
      ...command,
    },
    "*"
  )
}

export function EmbeddedPlayer({
  adverts,
  video,
  playbackState,
  miniPlayerMode,
  miniPlayerRestoreLabel,
  miniPlayerCloseLabel,
  miniPlayerMuteLabel,
  miniPlayerUnmuteLabel,
  onStateChange,
  onMiniPlayerRequest,
  onMiniPlayerAction,
}: {
  adverts: AdvertSettings
  video: Video
  playbackState: PlayerPlaybackState
  miniPlayerMode: "inline" | "active" | "disabled"
  miniPlayerRestoreLabel?: string
  miniPlayerCloseLabel?: string
  miniPlayerMuteLabel?: string
  miniPlayerUnmuteLabel?: string
  onStateChange?: (state: PlayerPlaybackState) => void
  onMiniPlayerRequest?: () => void
  onMiniPlayerAction?: (action: "restore" | "close") => void
}) {
  const callbacks = React.useRef({
    onStateChange,
    onMiniPlayerRequest,
    onMiniPlayerAction,
  })
  React.useLayoutEffect(() => {
    callbacks.current = {
      onStateChange,
      onMiniPlayerRequest,
      onMiniPlayerAction,
    }
  }, [onMiniPlayerAction, onMiniPlayerRequest, onStateChange])
  const [initialPlaybackState] = React.useState(playbackState)
  const activeSessionRef = React.useRef<string | null>(null)
  const lastSequenceRef = React.useRef(0)
  const playerMountRef = React.useRef<HTMLDivElement>(null)
  const config = React.useMemo(
    () => createConfig(video, initialPlaybackState, adverts),
    [adverts, initialPlaybackState, video]
  )

  const syncMode = React.useCallback(() => {
    const playerMode = miniPlayerMode === "active" ? "mini" : "full"
    const mode: "active" | "inline" =
      miniPlayerMode === "active" ? "active" : "inline"
    const value = {
      enabled: miniPlayerMode !== "disabled",
      mode,
      restoreLabel: miniPlayerRestoreLabel,
      closeLabel: miniPlayerCloseLabel,
      muteLabel: miniPlayerMuteLabel,
      unmuteLabel: miniPlayerUnmuteLabel,
    }
    if (window.PlayerHostBridge?.setMode(playerMode, value)) return
    sendCommand(video.player?.vdoId, {
      action: "player-mode",
      value: { playerMode, ...value },
    })
  }, [
    miniPlayerCloseLabel,
    miniPlayerMode,
    miniPlayerMuteLabel,
    miniPlayerRestoreLabel,
    miniPlayerUnmuteLabel,
    video.player?.vdoId,
  ])
  const syncModeRef = React.useRef(syncMode)
  React.useLayoutEffect(() => {
    syncModeRef.current = syncMode
  }, [syncMode])

  React.useEffect(() => {
    if (!config) return
    const mount = playerMountRef.current
    if (!mount) return
    const container = document.createElement("div")
    container.id = "player"
    container.className = "absolute inset-0 size-full bg-black"
    mount.append(container)
    let cancelled = false
    const receiveDetail = (detail: PlayerEventDetail | null | undefined) => {
      if (!detail || detail.source !== "code-player") return
      const expectedVideoId = video.player?.vdoId
      if (
        detail.videoId &&
        expectedVideoId &&
        String(detail.videoId) !== String(expectedVideoId)
      ) {
        return
      }
      if (detail.type === "bridge-ready") {
        activeSessionRef.current = detail.sessionId || null
        lastSequenceRef.current = detail.sequence || 0
        sendCommand(video.player?.vdoId, {
          action: "sync",
          state: initialPlaybackState,
          preserveAudio: true,
        })
        syncModeRef.current()
      } else {
        if (
          activeSessionRef.current &&
          detail.sessionId &&
          detail.sessionId !== activeSessionRef.current
        ) {
          return
        }
        if (
          typeof detail.sequence === "number" &&
          detail.sequence <= lastSequenceRef.current
        ) {
          return
        }
        if (typeof detail.sequence === "number") {
          lastSequenceRef.current = detail.sequence
        }
      }
      if (detail.type === "player-state") {
        if (detail.state) callbacks.current.onStateChange?.(detail.state)
      } else if (detail.type === "mini-player-request") {
        if (detail.state) callbacks.current.onStateChange?.(detail.state)
        callbacks.current.onMiniPlayerRequest?.()
      } else if (
        detail.type === "mini-player-action" &&
        (detail.action === "restore" || detail.action === "close")
      ) {
        if (detail.state) callbacks.current.onStateChange?.(detail.state)
        callbacks.current.onMiniPlayerAction?.(detail.action)
      }
    }
    const receiveMessage = (event: MessageEvent<PlayerEventDetail>) =>
      receiveDetail(event.data)
    const receiveEvent = (event: Event) => {
      if (event instanceof CustomEvent) receiveDetail(event.detail)
    }
    const playerEvents = [
      "code-player:bridge-ready",
      "code-player:player-state",
      "code-player:mini-player-request",
      "code-player:mini-player-action",
    ]
    window.addEventListener("message", receiveMessage)
    playerEvents.forEach((name) => window.addEventListener(name, receiveEvent))

    ensureAssets(config)
      .then(() => {
        if (cancelled || !window.JWPlayerKit) return
        window.PLAYER_CONFIG = config
        if (!window.hplayInstance) {
          window.JWPlayerKit.bootstrap({
            containerId: "player",
            autoCleanup: false,
          })
        }
      })
      .catch((error) => console.error("[embedded-player]", error))

    return () => {
      cancelled = true
      activeSessionRef.current = null
      lastSequenceRef.current = 0
      window.removeEventListener("message", receiveMessage)
      playerEvents.forEach((name) =>
        window.removeEventListener(name, receiveEvent)
      )
      window.JWPlayerKit?.destroyPlayer()
      // JW owns everything inside this boundary and may replace the original
      // target node during setup. React never reconciles these children, so
      // clearing the boundary cannot race with React's deletion phase.
      mount.replaceChildren()
      if (window.PLAYER_CONFIG === config) delete window.PLAYER_CONFIG
    }
  }, [config, initialPlaybackState, video.player?.vdoId])

  React.useEffect(() => {
    syncMode()
  }, [syncMode])

  return config ? (
    <div className="absolute inset-0 size-full bg-black">
      <div
        className="absolute inset-0 z-0 grid place-items-center bg-black"
        aria-hidden="true"
      >
        <svg viewBox="0 0 240 240" className="size-12 animate-spin fill-white">
          <path d="M120 186.667a66.667 66.667 0 010-133.333V40a80 80 0 1080 80h-13.333A66.846 66.846 0 01120 186.667z" />
        </svg>
      </div>
      <div ref={playerMountRef} className="absolute inset-0 z-10" />
    </div>
  ) : (
    <img
      src={video.thumbnailUrl || undefined}
      alt=""
      className="absolute inset-0 size-full object-cover"
    />
  )
}
