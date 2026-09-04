"use client"

import * as React from "react"
import type { Video } from "@workspace/core/types"
import type { AdvertSettings } from "@workspace/core/validators"
import { useTranslations } from "next-intl"
import { createPortal, flushSync } from "react-dom"

import { usePathname, useRouter } from "@/i18n/navigation"
import { EmbeddedPlayer, type PlayerPlaybackState } from "./embedded-player"

type PlayerState = {
  video: Video | null
  playlist: { id: string; index: number } | null
  currentTime: number
  isPlaying: boolean
  muted: boolean
  volume: number
  speed: number
  started: boolean
}

type PlayerSurface = "watch" | "mini"

type WatchPlayerContextValue = PlayerState & {
  activate: (
    video: Video,
    playlist?: { id: string; index: number } | null
  ) => void
  dismiss: () => void
  openMiniPlayer: () => void
  seek: (time: number) => void
  setSpeed: (speed: number) => void
  setVolume: (volume: number) => void
  toggleMuted: () => void
  togglePlaying: () => void
  syncPlayback: (state: PlayerPlaybackState, surface: PlayerSurface) => void
  registerWatchHost: (node: HTMLDivElement | null) => void
}

const initialState: PlayerState = {
  video: null,
  playlist: null,
  currentTime: 0,
  isPlaying: false,
  muted: false,
  volume: 0.8,
  speed: 1,
  started: false,
}
const WatchPlayerContext = React.createContext<WatchPlayerContextValue | null>(
  null
)

export function useWatchPlayer() {
  const value = React.useContext(WatchPlayerContext)
  if (!value)
    throw new Error("useWatchPlayer must be used inside WatchPlayerProvider")
  return value
}

export function WatchPlayerProvider({
  children,
  adverts,
}: {
  children: React.ReactNode
  adverts: AdvertSettings
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [state, setState] = React.useState(initialState)
  const [watchHost, setWatchHost] = React.useState<HTMLDivElement | null>(null)
  const [miniRequested, setMiniRequested] = React.useState(false)
  const [playerSurface, setPlayerSurface] = React.useState<HTMLElement | null>(
    null
  )
  const playerSurfaceRef = React.useRef<HTMLElement | null>(null)
  const activeSurface = React.useRef<PlayerSurface>("watch")
  activeSurface.current =
    pathname.startsWith("/watch") && !miniRequested ? "watch" : "mini"

  React.useEffect(() => {
    const surface = document.createElement("aside")
    surface.dataset.watchPlayerSurface = ""
    document.body.append(surface)
    playerSurfaceRef.current = surface
    setPlayerSurface(surface)

    return () => {
      if (playerSurfaceRef.current === surface) playerSurfaceRef.current = null
      surface.remove()
    }
  }, [])

  const activate = React.useCallback(
    (video: Video, playlist: { id: string; index: number } | null = null) =>
      setState((current) => {
        if (current.video?.id !== video.id)
          return {
            ...initialState,
            video,
            playlist,
            muted: current.muted,
            volume: current.volume,
            speed: current.speed,
          }
        if (
          current.playlist?.id === playlist?.id &&
          current.playlist?.index === playlist?.index
        )
          return current
        return { ...current, playlist }
      }),
    []
  )
  const togglePlaying = React.useCallback(
    () =>
      setState((current) =>
        current.video
          ? { ...current, started: true, isPlaying: !current.isPlaying }
          : current
      ),
    []
  )
  const toggleMuted = React.useCallback(
    () => setState((current) => ({ ...current, muted: !current.muted })),
    []
  )
  const seek = React.useCallback(
    (time: number) =>
      setState((current) => ({
        ...current,
        currentTime: Math.max(
          0,
          Math.min(current.video?.durationSeconds ?? 0, time)
        ),
      })),
    []
  )
  const setVolume = React.useCallback(
    (volume: number) =>
      setState((current) => ({ ...current, volume, muted: volume === 0 })),
    []
  )
  const setSpeed = React.useCallback(
    (speed: number) => setState((current) => ({ ...current, speed })),
    []
  )
  const syncPlayback = React.useCallback(
    (patch: PlayerPlaybackState, surface: PlayerSurface) => {
      if (surface !== activeSurface.current) return
      setState((current) =>
        current.video
          ? {
              ...current,
              ...(typeof patch.currentTime === "number"
                ? { currentTime: patch.currentTime }
                : {}),
              ...(typeof patch.isPlaying === "boolean"
                ? { isPlaying: patch.isPlaying }
                : {}),
              ...(typeof patch.muted === "boolean"
                ? { muted: patch.muted }
                : {}),
              ...(typeof patch.volume === "number"
                ? { volume: patch.volume }
                : {}),
              ...(typeof patch.speed === "number"
                ? { speed: patch.speed }
                : {}),
              ...(typeof patch.started === "boolean"
                ? { started: current.started || patch.started }
                : {}),
            }
          : current
      )
    },
    []
  )
  const dismiss = React.useCallback(() => {
    setState((current) => ({
      ...initialState,
      muted: current.muted,
      volume: current.volume,
      speed: current.speed,
    }))
    setMiniRequested(false)
  }, [])
  const registerWatchHost = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      const surface = playerSurfaceRef.current
      // Keep the persistent player alive when React removes the watch page.
      // Moving it first prevents the media element from being detached with
      // its host during a route transition.
      if (surface?.isConnected && surface.parentElement !== document.body)
        document.body.append(surface)
    }
    setWatchHost(node)
    if (node) setMiniRequested(false)
  }, [])
  const openMiniPlayer = React.useCallback(() => {
    // Commit the playback snapshot before navigation swaps the watch surface
    // for the miniplayer surface. Without this, a fast route transition can
    // render the destination from the previous (not-started) snapshot.
    flushSync(() => {
      setState((current) => ({ ...current, started: true }))
      setMiniRequested(true)
    })
    const surface = playerSurfaceRef.current
    if (surface?.isConnected && surface.parentElement !== document.body)
      document.body.append(surface)
    router.push("/")
  }, [router])
  const value = React.useMemo(
    () => ({
      ...state,
      activate,
      dismiss,
      openMiniPlayer,
      registerWatchHost,
      seek,
      setSpeed,
      setVolume,
      syncPlayback,
      toggleMuted,
      togglePlaying,
    }),
    [
      activate,
      dismiss,
      openMiniPlayer,
      registerWatchHost,
      seek,
      setSpeed,
      setVolume,
      syncPlayback,
      state,
      toggleMuted,
      togglePlaying,
    ]
  )
  const showMiniPlayer = Boolean(
    state.video &&
    state.started &&
    !pathname.startsWith("/watch") &&
    !pathname.startsWith("/shorts")
  )
  const isWatchPage = pathname.startsWith("/watch")
  const useWatchSurface = Boolean(isWatchPage && watchHost && !miniRequested)
  const showPersistentPlayer = Boolean(
    state.video &&
    !pathname.startsWith("/shorts") &&
    (isWatchPage || showMiniPlayer)
  )

  return (
    <WatchPlayerContext.Provider value={value}>
      {children}
      {showPersistentPlayer && state.video ? (
        <PersistentPlayer
          adverts={adverts}
          video={state.video}
          state={value}
          surface={playerSurface}
          watchHost={watchHost}
          watchMode={useWatchSurface}
          visible={
            useWatchSurface ||
            Boolean(
              state.started && (miniRequested || !isWatchPage || !watchHost)
            )
          }
        />
      ) : null}
    </WatchPlayerContext.Provider>
  )
}

function PersistentPlayer({
  adverts,
  video,
  state,
  surface,
  watchHost,
  watchMode,
  visible,
}: {
  adverts: AdvertSettings
  video: Video
  state: WatchPlayerContextValue
  surface: HTMLElement | null
  watchHost: HTMLDivElement | null
  watchMode: boolean
  visible: boolean
}) {
  const t = useTranslations("video")
  const router = useRouter()
  const syncPlayback = state.syncPlayback
  const syncCurrentPlayback = React.useCallback(
    (patch: PlayerPlaybackState) =>
      syncPlayback(patch, watchMode ? "watch" : "mini"),
    [syncPlayback, watchMode]
  )
  const watchHref = state.playlist
    ? `/watch/${video.id}?list=${encodeURIComponent(state.playlist.id)}&index=${state.playlist.index}`
    : `/watch/${video.id}`
  const dismiss = state.dismiss
  const handleMiniPlayerAction = React.useCallback(
    (action: "restore" | "close") => {
      if (action === "restore") router.push(watchHref)
      else dismiss()
    },
    [dismiss, router, watchHref]
  )
  const playerPlaybackState = React.useMemo<PlayerPlaybackState>(
    () => ({
      currentTime: state.currentTime,
      isPlaying: state.isPlaying,
      muted: state.muted,
      volume: state.volume,
      speed: state.speed,
      started: state.started,
    }),
    [
      state.currentTime,
      state.isPlaying,
      state.muted,
      state.speed,
      state.started,
      state.volume,
    ]
  )

  React.useLayoutEffect(() => {
    if (!surface) return
    surface.setAttribute("aria-label", t("nowPlaying", { title: video.title }))
    surface.className = watchMode
      ? `absolute inset-0 z-10 overflow-hidden bg-black sm:rounded-xl ${visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`
      : `fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[70] w-[calc(100vw-24px)] max-w-[400px] overflow-hidden rounded-xl border bg-background shadow-2xl lg:right-5 lg:bottom-5 ${visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`

    const destination = watchMode ? watchHost : document.body
    if (destination && surface.parentElement !== destination)
      destination.append(surface)
  }, [surface, t, video.title, visible, watchHost, watchMode])

  if (!surface) return null

  return createPortal(
    <>
      <div className="group relative aspect-video overflow-hidden bg-black text-white">
        <EmbeddedPlayer
          adverts={adverts}
          key={video.id}
          video={video}
          playbackState={playerPlaybackState}
          miniPlayerMode={watchMode ? "inline" : "active"}
          miniPlayerRestoreLabel={t("returnToVideo")}
          miniPlayerCloseLabel={t("closeVideo")}
          miniPlayerMuteLabel={t("mute")}
          miniPlayerUnmuteLabel={t("unmute")}
          onStateChange={syncCurrentPlayback}
          onMiniPlayerRequest={state.openMiniPlayer}
          onMiniPlayerAction={handleMiniPlayerAction}
        />
      </div>
      {!watchMode ? (
        <div className="flex min-h-16 items-center bg-background px-4 py-2.5 text-foreground">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{video.title}</p>
            {video.channel?.name ? (
              <p className="truncate text-xs text-muted-foreground">
                {video.channel.name}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>,
    surface
  )
}
