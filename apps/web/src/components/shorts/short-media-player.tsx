"use client"

import * as React from "react"
import type { Short } from "@workspace/core/types"
import { Pause, Play, Volume2, VolumeX } from "lucide-react"
import { useTranslations } from "next-intl"

export function ShortMediaPlayer({ short, active, muted, onMutedChange }: { short: Short; active: boolean; muted: boolean; onMutedChange: (value: boolean) => void }) {
  const t = useTranslations("video")
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!active || paused) {
      video.pause()
      if (!active) video.currentTime = 0
      return
    }
    void video.play().catch(() => setPaused(true))
  }, [active, paused])

  return (
    <div className="absolute inset-0 bg-black">
      {short.playbackUrl && !failed ? (
        <video ref={videoRef} src={short.playbackUrl} poster={short.thumbnailUrl} muted={muted} loop playsInline preload={active ? "auto" : "metadata"} onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={short.thumbnailUrl} alt="" className={`size-full object-cover transition-transform duration-[8000ms] ${active && !paused ? "scale-110" : "scale-100"}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/25" />
      <button type="button" aria-label={t(paused ? "play" : "pause")} onClick={() => setPaused((value) => !value)} className="absolute inset-0 grid place-items-center">
        {paused ? <Play className="size-16 fill-white text-white drop-shadow" /> : <Pause className="size-14 fill-white text-white opacity-0 transition-opacity hover:opacity-90" />}
      </button>
      <button type="button" aria-label={t(muted ? "unmute" : "mute")} onClick={() => onMutedChange(!muted)} className="absolute top-4 right-4 z-10 hidden size-10 place-items-center rounded-full bg-black/45 hover:bg-black/65 lg:grid">
        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
    </div>
  )
}
