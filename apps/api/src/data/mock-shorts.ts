import type { Short } from "@workspace/core/types";
import { mockVideos } from "./mock-videos";

const shortTitles = [
    "Bangkok in 30 seconds 🌃",
    "Street food you cannot miss",
    "One coding tip that saves hours",
    "A hidden beach in Thailand",
    "Instantly improve your lighting",
    "A quiet moment for your day",
    "This camera setting changes everything",
    "Start your morning with this move",
];

export const mockShorts: Short[] = Array.from({ length: 30 }, (_, index) => {
  const video = mockVideos[index % mockVideos.length]!;
  const round = Math.floor(index / mockVideos.length) + 1;
  return {
  ...video,
  id: `${video.id}-short-${round}`,
  title: index < shortTitles.length ? shortTitles[index]! : `${shortTitles[index % shortTitles.length]} · Part ${round}`,
  durationSeconds: 30 + index * 4,
  category: "Shorts",
  likeCount: 12400 + index * 8750,
  commentCount: 320 + index * 97,
  shareCount: 180 + index * 61,
  commentPolicy: index % 9 === 7 ? "disabled" : index % 9 === 8 ? "review" : "enabled",
  };
});
