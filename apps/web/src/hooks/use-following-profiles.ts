"use client"

import type { FollowingProfile } from "@workspace/core/types"
import { useCursorPage } from "./use-cursor-page"

export const initialFollowingProfiles: FollowingProfile[] = [
  { id: "urban-lens", type: "actor", name: "Urban Lens", handle: "urbanlens", initials: "UL", avatarUrl: null, verified: true, isLive: false },
  { id: "taste-trails", type: "actor", name: "Taste Trails", handle: "tastetrails", initials: "TT", avatarUrl: null, verified: true, isLive: false },
  { id: "dev-studio", type: "studio", name: "Dev Studio", handle: "devstudio", initials: "DS", avatarUrl: null, verified: true, isLive: false },
]

export function useFollowingProfiles() {
  return useCursorPage<FollowingProfile>({
    endpoint: "/api/v1/following",
    initialItems: initialFollowingProfiles,
    initialNextCursor: "3",
  })
}
