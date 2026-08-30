"use client"

import * as React from "react"
import type { ShortsPageResponse } from "@workspace/core/types"

async function fetchPage(page: number) {
  const response = await fetch(`/api/v1/shorts?page=${page}&pageSize=5`, { headers: { accept: "application/json" } })
  if (!response.ok) throw new Error(`Shorts API returned ${response.status}`)
  return response.json() as Promise<ShortsPageResponse>
}

export function useShortsFeed(initialPage: ShortsPageResponse) {
  const [videos, setVideos] = React.useState(initialPage.items)
  const [nextPage, setNextPage] = React.useState(initialPage.nextPage)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const loadingRef = React.useRef(false)
  const failedActionRef = React.useRef<"next" | "refresh">("next")

  const loadNextPage = React.useCallback(async () => {
    if (nextPage === null || loadingRef.current) return
    loadingRef.current = true; setIsLoading(true); setError(null)
    try {
      const response = await fetchPage(nextPage)
      setVideos((current) => { const ids = new Set(current.map((item) => item.id)); return [...current, ...response.items.filter((item) => !ids.has(item.id))] })
      setNextPage(response.nextPage)
    } catch { failedActionRef.current = "next"; setError("load") }
    finally { loadingRef.current = false; setIsLoading(false) }
  }, [nextPage])

  const refreshFeed = React.useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true; setIsLoading(true); setError(null)
    try { const response = await fetchPage(1); setVideos(response.items); setNextPage(response.nextPage) }
    catch { failedActionRef.current = "refresh"; setError("refresh"); throw new Error("Unable to refresh Shorts") }
    finally { loadingRef.current = false; setIsLoading(false) }
  }, [])

  const retry = React.useCallback(() => failedActionRef.current === "refresh" ? refreshFeed() : loadNextPage(), [loadNextPage, refreshFeed])
  return { videos, hasNextPage: nextPage !== null, isLoading, error, loadNextPage, refreshFeed, retry }
}
