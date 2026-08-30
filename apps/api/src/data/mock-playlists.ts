import type { Playlist, Video } from "@workspace/core/types";
import { mockVideos } from "./mock-videos";

function rotate(items: Video[], offset: number) {
  const safeOffset = offset % items.length;
  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)];
}

export const mockPlaylists: Playlist[] = [
  {
    id: "urban-lens-popular",
    title: "Urban Lens Essentials",
    description: "Cinematic journeys through cities and nature",
    owner: "Urban Lens",
    visibility: "public",
    items: rotate(mockVideos, 0).slice(0, 8),
  },
  {
    id: "focus-and-create",
    title: "Focus and Create",
    description: "Music, workspace ideas, and creator tutorials",
    owner: "Quiet Room",
    visibility: "public",
    items: rotate(mockVideos, 5).slice(0, 8),
  },
  {
    id: "weekend-discovery",
    title: "Weekend Discovery",
    description: "Food, travel, fitness, and stories worth watching",
    owner: "AVXTUBE",
    visibility: "public",
    items: rotate(mockVideos, 2).slice(0, 8),
  },
];
