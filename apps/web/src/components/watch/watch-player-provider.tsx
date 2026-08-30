/* eslint-disable @next/next/no-img-element */
"use client"

import * as React from "react"
import type { Video } from "@workspace/core/types"
import { Maximize2, Pause, Play, Volume2, VolumeX, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { usePathname, useRouter } from "@/i18n/navigation"

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

type WatchPlayerContextValue = PlayerState & {
  activate: (video: Video, playlist?: { id: string; index: number } | null) => void
  dismiss: () => void
  openMiniPlayer: () => void
  seek: (time: number) => void
  setSpeed: (speed: number) => void
  setVolume: (volume: number) => void
  toggleMuted: () => void
  togglePlaying: () => void
}

const initialState: PlayerState = { video: null, playlist: null, currentTime: 0, isPlaying: false, muted: false, volume: 0.8, speed: 1, started: false }
const WatchPlayerContext = React.createContext<WatchPlayerContextValue | null>(null)

export function useWatchPlayer() {
  const value = React.useContext(WatchPlayerContext)
  if (!value) throw new Error("useWatchPlayer must be used inside WatchPlayerProvider")
  return value
}

export function WatchPlayerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [state, setState] = React.useState(initialState)

  React.useEffect(() => {
    if (!state.isPlaying || !state.video) return
    const timer = window.setInterval(() => setState((current) => {
      if (!current.video || !current.isPlaying) return current
      const nextTime = Math.min(current.video.durationSeconds, current.currentTime + current.speed)
      return { ...current, currentTime: nextTime, isPlaying: nextTime < current.video.durationSeconds }
    }), 1000)
    return () => window.clearInterval(timer)
  }, [state.isPlaying, state.video])

  const activate = React.useCallback((video: Video, playlist: { id: string; index: number } | null = null) => setState((current) => {
    if (current.video?.id !== video.id) return { ...initialState, video, playlist }
    if (current.playlist?.id === playlist?.id && current.playlist?.index === playlist?.index) return current
    return { ...current, playlist }
  }), [])
  const togglePlaying = React.useCallback(() => setState((current) => current.video ? { ...current, started: true, isPlaying: !current.isPlaying } : current), [])
  const toggleMuted = React.useCallback(() => setState((current) => ({ ...current, muted: !current.muted })), [])
  const seek = React.useCallback((time: number) => setState((current) => ({ ...current, currentTime: Math.max(0, Math.min(current.video?.durationSeconds ?? 0, time)) })), [])
  const setVolume = React.useCallback((volume: number) => setState((current) => ({ ...current, volume, muted: volume === 0 })), [])
  const setSpeed = React.useCallback((speed: number) => setState((current) => ({ ...current, speed })), [])
  const dismiss = React.useCallback(() => setState(initialState), [])
  const openMiniPlayer = React.useCallback(() => {
    setState((current) => ({ ...current, started: true }))
    router.push("/")
  }, [router])
  const value = React.useMemo(() => ({ ...state, activate, dismiss, openMiniPlayer, seek, setSpeed, setVolume, toggleMuted, togglePlaying }), [activate, dismiss, openMiniPlayer, seek, setSpeed, setVolume, state, toggleMuted, togglePlaying])
  const showMiniPlayer = Boolean(state.video && state.started && !pathname.startsWith("/watch") && !pathname.startsWith("/shorts"))

  return <WatchPlayerContext.Provider value={value}>{children}{showMiniPlayer && state.video ? <MiniPlayer video={state.video} state={value} /> : null}</WatchPlayerContext.Provider>
}

function MiniPlayer({ video, state }: { video: Video; state: WatchPlayerContextValue }) {
  const t = useTranslations("video")
  const router = useRouter()
  const progress = video.durationSeconds > 0 ? state.currentTime / video.durationSeconds * 100 : 0
  const watchHref = state.playlist
    ? `/watch/${video.id}?list=${encodeURIComponent(state.playlist.id)}&index=${state.playlist.index}`
    : `/watch/${video.id}`
  return <aside aria-label={t("nowPlaying", { title: video.title })} className="fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[70] w-[calc(100vw-24px)] max-w-[390px] overflow-hidden rounded-xl border bg-background shadow-2xl lg:right-5 lg:bottom-5">
    <div className="group relative aspect-video overflow-hidden bg-black text-white"><img src={video.thumbnailUrl} alt="" className="size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      <div className="absolute top-2 right-2 flex gap-1"><button type="button" aria-label={t("returnToVideo")} onClick={() => router.push(watchHref)} className="flex size-9 items-center justify-center rounded-full bg-black/60"><Maximize2 className="size-4" /></button><button type="button" aria-label={t("closeVideo")} onClick={state.dismiss} className="flex size-9 items-center justify-center rounded-full bg-black/60"><X className="size-5" /></button></div>
      <button type="button" aria-label={t(state.isPlaying ? "pause" : "play")} onClick={state.togglePlaying} className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50">{state.isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}</button>
      <div className="absolute right-3 bottom-3 left-3 flex items-end gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{video.title}</p><p className="truncate text-xs text-white/70">{video.channel.name}</p></div><button type="button" aria-label={t(state.muted ? "unmute" : "mute")} onClick={state.toggleMuted} className="flex size-9 items-center justify-center rounded-full bg-black/50">{state.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button></div>
    </div><div className="h-1 bg-muted"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
  </aside>
}
