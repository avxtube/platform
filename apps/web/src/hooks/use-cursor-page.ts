"use client"

import * as React from "react"
import type { CursorPage } from "@workspace/core/types"

export function useCursorPage<Item extends { id: string }>({
  endpoint,
  initialItems,
  initialNextCursor,
}: {
  endpoint: string
  initialItems: Item[]
  initialNextCursor: string | null
}) {
  const [items, setItems] = React.useState(initialItems)
  const [nextCursor, setNextCursor] = React.useState(initialNextCursor)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const loadMore = React.useCallback(async () => {
    if (!nextCursor || loading) return
    setLoading(true)
    setError(null)
    try {
      const url = new URL(endpoint, window.location.origin)
      url.searchParams.set("cursor", nextCursor)
      url.searchParams.set("limit", "4")
      const response = await fetch(url, { headers: { accept: "application/json" } })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const page = await response.json() as CursorPage<Item>
      setItems((current) => {
        const existingIds = new Set(current.map((item) => item.id))
        return [...current, ...page.items.filter((item) => !existingIds.has(item.id))]
      })
      setNextCursor(page.nextCursor)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load more")
    } finally {
      setLoading(false)
    }
  }, [endpoint, loading, nextCursor])

  const prepend = React.useCallback((item: Item) => {
    setItems((current) => [item, ...current.filter((currentItem) => currentItem.id !== item.id)])
  }, [])

  const updateItems = React.useCallback((update: React.SetStateAction<Item[]>) => setItems(update), [])

  return {
    items,
    hasMore: nextCursor !== null,
    loading,
    error,
    loadMore,
    prepend,
    updateItems,
  }
}
