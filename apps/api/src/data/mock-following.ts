import type { FollowingProfile } from "@workspace/core/types";

export const mockFollowing: FollowingProfile[] = [
  { id: "urban-lens", type: "actor", name: "Urban Lens", handle: "urbanlens", initials: "UL", avatarUrl: null, verified: true, isLive: false },
  { id: "taste-trails", type: "actor", name: "Taste Trails", handle: "tastetrails", initials: "TT", avatarUrl: null, verified: true, isLive: false },
  { id: "dev-studio", type: "studio", name: "Dev Studio", handle: "devstudio", initials: "DS", avatarUrl: null, verified: true, isLive: false },
  { id: "above-earth", type: "studio", name: "Above Earth", handle: "aboveearth", initials: "AE", avatarUrl: null, verified: true, isLive: true },
  { id: "creator-lab", type: "studio", name: "Creator Lab", handle: "creatorlab", initials: "CL", avatarUrl: null, verified: false, isLive: false },
  { id: "quiet-room", type: "actor", name: "Quiet Room", handle: "quietroom", initials: "QR", avatarUrl: null, verified: true, isLive: false },
  { id: "frame-school", type: "studio", name: "Frame School", handle: "frameschool", initials: "FS", avatarUrl: null, verified: true, isLive: false },
  { id: "move-daily", type: "actor", name: "Move Daily", handle: "movedaily", initials: "MD", avatarUrl: null, verified: false, isLive: true },
];
