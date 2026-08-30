import type { FollowingProfile } from "@workspace/core/types";
import { mockActors } from "./mock-actors";

const profiles: FollowingProfile[] = [
  { id: "urban-lens", type: "actor", name: "Urban Lens", handle: "urbanlens", initials: "UL", avatarUrl: null, verified: true, isLive: false, hasNew: true },
  { id: "taste-trails", type: "actor", name: "Taste Trails", handle: "tastetrails", initials: "TT", avatarUrl: null, verified: true, isLive: false, hasNew: true },
  { id: "dev-studio", type: "studio", name: "Dev Studio", handle: "devstudio", initials: "DS", avatarUrl: null, verified: true, isLive: false, hasNew: false },
  { id: "above-earth", type: "studio", name: "Above Earth", handle: "aboveearth", initials: "AE", avatarUrl: null, verified: true, isLive: true, hasNew: true },
  { id: "creator-lab", type: "studio", name: "Creator Lab", handle: "creatorlab", initials: "CL", avatarUrl: null, verified: false, isLive: false, hasNew: false },
  { id: "quiet-room", type: "actor", name: "Quiet Room", handle: "quietroom", initials: "QR", avatarUrl: null, verified: true, isLive: false, hasNew: true },
  { id: "frame-school", type: "studio", name: "Frame School", handle: "frameschool", initials: "FS", avatarUrl: null, verified: true, isLive: false, hasNew: false },
  { id: "move-daily", type: "actor", name: "Move Daily", handle: "movedaily", initials: "MD", avatarUrl: null, verified: false, isLive: true, hasNew: true },
];

export const mockFollowing: FollowingProfile[] = profiles.map((profile) => ({
  ...profile,
  avatarUrl: mockActors.find((actor) => actor.id === profile.id)?.coverUrl ?? null,
}));
