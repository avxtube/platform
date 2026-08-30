"use client"

import type { WatchComment } from "@workspace/core/types"
import { useCursorPage } from "./use-cursor-page"

export function useShortComments(shortId: string, initialComments: WatchComment[], initialNextCursor: string | null) {
  return useCursorPage<WatchComment>({ endpoint: `/api/v1/shorts/${encodeURIComponent(shortId)}/comments`, initialItems: initialComments, initialNextCursor })
}
