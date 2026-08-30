"use client"

import type { Video } from "@workspace/core/types"
import { useCursorPage } from "./use-cursor-page"

export function useRelatedVideos(videoId: string, initialVideos: Video[], initialNextCursor: string | null) {
  return useCursorPage<Video>({
    endpoint: `/api/v1/videos/${encodeURIComponent(videoId)}/related`,
    initialItems: initialVideos,
    initialNextCursor,
  })
}
