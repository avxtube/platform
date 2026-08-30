"use client"

import * as React from "react"
import type { Short } from "@workspace/core/types"

export function useShortOverlays() {
  const [commentsOpen, setCommentsOpen] = React.useState(false)
  const [shareVideo, setShareVideo] = React.useState<Short | null>(null)
  const [remixVideo, setRemixVideo] = React.useState<Short | null>(null)
  React.useEffect(() => {
    if (!commentsOpen && !shareVideo && !remixVideo) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = overflow }
  }, [commentsOpen, remixVideo, shareVideo])
  return {
    commentsOpen,
    shareVideo,
    remixVideo,
    closeComments: React.useCallback(() => setCommentsOpen(false), []),
    toggleComments: React.useCallback(() => setCommentsOpen((value) => !value), []),
    openShare: React.useCallback((video: Short) => setShareVideo(video), []),
    closeShare: React.useCallback(() => setShareVideo(null), []),
    openRemix: React.useCallback((video: Short) => setRemixVideo(video), []),
    closeRemix: React.useCallback(() => setRemixVideo(null), []),
  }
}
