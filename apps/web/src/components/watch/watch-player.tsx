/* eslint-disable @next/next/no-img-element */
"use client"

import * as React from "react"
import type { Video } from "@workspace/core/types"
import { Captions, Maximize, Minimize, Pause, PictureInPicture2, Play, Settings, Volume2, VolumeX } from "lucide-react"
import { useTranslations } from "next-intl"

import { useWatchPlayer } from "./watch-player-provider"

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
}

export function WatchPlayer({ video, theater, onTheater, playlist }: { video: Video; theater: boolean; onTheater: () => void; playlist?: { id: string; index: number } | null }) {
  const t = useTranslations("video")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const player = useWatchPlayer()
  const [fullscreen, setFullscreen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [quality, setQuality] = React.useState("1080p")
  const [captions, setCaptions] = React.useState(false)
  const playlistId = playlist?.id
  const playlistIndex = playlist?.index

  const activate = player.activate
  React.useEffect(() => activate(video, playlistId && playlistIndex ? { id: playlistId, index: playlistIndex } : null), [activate, playlistId, playlistIndex, video])
  React.useEffect(() => {
    function onFullscreenChange() { setFullscreen(Boolean(document.fullscreenElement)) }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === " ") { event.preventDefault(); player.togglePlaying() }
      if (event.key.toLowerCase() === "m") player.toggleMuted()
      if (event.key.toLowerCase() === "t") onTheater()
      if (event.key.toLowerCase() === "f") void (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen())
      if (event.key === "ArrowRight") player.seek(player.currentTime + 5)
      if (event.key === "ArrowLeft") player.seek(player.currentTime - 5)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onTheater, player])

  return <div ref={rootRef} id="watch-player" className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black text-white">
    <img src={video.thumbnailUrl} alt="" className="size-full object-cover" /><div className="absolute inset-0 bg-black/20" />
    <button type="button" aria-label={t(player.isPlaying ? "pause" : "play")} onClick={player.togglePlaying} className="absolute inset-0 flex items-center justify-center"><span className="flex size-16 items-center justify-center rounded-full bg-black/55">{player.isPlaying ? <Pause className="size-7 fill-current" /> : <Play className="ml-1 size-7 fill-current" />}</span></button>
    {captions ? <p className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded bg-black/80 px-3 py-1 text-sm">{t("mockCaption")}</p> : null}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 p-3 pt-10"><input aria-label={t("seek")} type="range" min={0} max={video.durationSeconds} value={player.currentTime} onChange={(event) => player.seek(Number(event.target.value))} className="h-1 w-full accent-red-600" /><div className="mt-2 flex items-center gap-2">
      <button type="button" onClick={player.togglePlaying}>{player.isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}</button><button type="button" onClick={player.toggleMuted}>{player.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button><input aria-label={t("volume")} type="range" min={0} max={1} step={0.05} value={player.volume} onChange={(event) => player.setVolume(Number(event.target.value))} className="hidden w-20 accent-white sm:block" /><span className="text-xs tabular-nums">{clock(player.currentTime)} / {clock(video.durationSeconds)}</span>
      <div className="ml-auto flex items-center gap-3"><button type="button" aria-pressed={captions} onClick={() => setCaptions((value) => !value)}><Captions className={`size-5 ${captions ? "text-red-500" : ""}`} /></button><div className="relative"><button type="button" onClick={() => setSettingsOpen((value) => !value)}><Settings className="size-5" /></button>{settingsOpen ? <div className="absolute right-0 bottom-8 w-48 rounded-xl bg-black/90 p-3 text-xs shadow-xl"><label className="block">{t("quality")}<select value={quality} onChange={(event) => setQuality(event.target.value)} className="mt-1 w-full rounded bg-white/10 p-2"><option>1080p</option><option>720p</option><option>480p</option></select></label><label className="mt-3 block">{t("speed")}<select value={player.speed} onChange={(event) => player.setSpeed(Number(event.target.value))} className="mt-1 w-full rounded bg-white/10 p-2"><option value={0.5}>0.5x</option><option value={1}>1x</option><option value={1.5}>1.5x</option><option value={2}>2x</option></select></label></div> : null}</div><button type="button" aria-label={t("miniPlayer")} onClick={player.openMiniPlayer}><PictureInPicture2 className="size-5" /></button><button type="button" aria-label={t("theaterMode")} onClick={onTheater}><span className={`block h-4 w-6 border-2 ${theater ? "border-t-4" : ""}`} /></button><button type="button" aria-label={t("fullscreen")} onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : rootRef.current?.requestFullscreen())}>{fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}</button></div>
    </div></div>
  </div>
}
