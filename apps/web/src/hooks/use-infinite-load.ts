"use client"

import * as React from "react"

export function useInfiniteLoad({
  hasMore,
  loading,
  error,
  loadMore,
  rootMargin = "320px 0px",
}: {
  hasMore: boolean
  loading: boolean
  error?: string | null
  loadMore: () => Promise<void>
  rootMargin?: string
}) {
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const requestingRef = React.useRef(false)

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loading || error) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || requestingRef.current) return
        requestingRef.current = true
        void loadMore().finally(() => {
          requestingRef.current = false
        })
      },
      { rootMargin }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [error, hasMore, loadMore, loading, rootMargin])

  return sentinelRef
}

