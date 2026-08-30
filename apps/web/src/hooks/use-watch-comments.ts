"use client"

import type { WatchComment } from "@workspace/core/types"
import { useCursorPage } from "./use-cursor-page"

export function useWatchComments(videoId: string, initialComments: WatchComment[], initialNextCursor: string | null) {
  return useCursorPage<WatchComment>({
    endpoint: `/api/v1/videos/${encodeURIComponent(videoId)}/comments`,
    initialItems: initialComments,
    initialNextCursor,
  })
}
