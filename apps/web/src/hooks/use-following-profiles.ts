"use client"

import type { FollowingProfile } from "@workspace/core/types"
import { useCursorPage } from "./use-cursor-page"

export const initialFollowingProfiles: FollowingProfile[] = [
  { id: "urban-lens", type: "actor", name: "Urban Lens", handle: "urbanlens", initials: "UL", avatarUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=96&q=80", verified: true, isLive: false, hasNew: true },
  { id: "taste-trails", type: "actor", name: "Taste Trails", handle: "tastetrails", initials: "TT", avatarUrl: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=96&q=80", verified: true, isLive: false, hasNew: true },
  { id: "dev-studio", type: "studio", name: "Dev Studio", handle: "devstudio", initials: "DS", avatarUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=96&q=80", verified: true, isLive: false, hasNew: false },
]

export function useFollowingProfiles() {
  const page = useCursorPage<FollowingProfile>({
    endpoint: "/api/v1/following",
    initialItems: initialFollowingProfiles,
    initialNextCursor: "3",
  })
  return {
    ...page,
    expanded: page.items.length > initialFollowingProfiles.length,
    collapse: () => page.reset(initialFollowingProfiles, "3"),
  }
}
