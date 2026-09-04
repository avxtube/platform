"use client"

import * as React from "react"
import type { FollowingProfile } from "@workspace/core/types"
import { useCursorPage } from "./use-cursor-page"

export function useFollowingProfiles() {
  const page = useCursorPage<FollowingProfile>({
    endpoint: "/api/v1/following",
    initialItems: [],
    initialNextCursor: "0",
    pageSize: 3,
  })
  const loadInitialPage = page.loadMore
  const requested = React.useRef(false)
  React.useEffect(() => {
    if (requested.current) return
    requested.current = true
    void loadInitialPage()
  }, [loadInitialPage])
  return {
    ...page,
    expanded: page.items.length > 3,
    collapse: () => page.reset(page.items.slice(0, 3), "3"),
  }
}
