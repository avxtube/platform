import type { WatchComment } from "@workspace/core/types";

export const mockComments: WatchComment[] = [
  { id: "comment-1", author: "Mali Viewer", initials: "MV", message: "The scene at 2:15 is incredible. Great work!", likeCount: 128, publishedAt: "2026-08-29T12:30:00.000Z", pinned: true, replies: [{ id: "reply-1", author: "Urban Lens", initials: "UL", message: "Thank you! That was our favorite shot too.", likeCount: 24, publishedAt: "2026-08-29T13:10:00.000Z" }] },
  { id: "comment-2", author: "Krit Journey", initials: "KJ", message: "Could you make a behind-the-scenes video about the camera setup?", likeCount: 67, publishedAt: "2026-08-28T09:20:00.000Z" },
  { id: "comment-3", author: "Nina Creates", initials: "NC", message: "The colors and sound design are beautiful. Saved this for later.", likeCount: 41, publishedAt: "2026-08-27T17:45:00.000Z" },
  ...Array.from({ length: 15 }, (_, index): WatchComment => ({
    id: `comment-${index + 4}`,
    author: ["Ploy Film", "Ton Explorer", "May Studio", "Bank Viewer", "Fah Journey"][index % 5]!,
    initials: ["PF", "TE", "MS", "BV", "FJ"][index % 5]!,
    message: [
      "This video deserves more views. The production is excellent!",
      "I learned something new today. Please make another episode.",
      "The camera movement and pacing are so smooth.",
      "Watching from Thailand. Thanks for sharing this story.",
      "Added this to my favorites — I will definitely watch it again.",
    ][index % 5]!,
    likeCount: Math.max(2, 38 - index * 2),
    publishedAt: new Date(Date.UTC(2026, 7, 26 - index, 10, 0)).toISOString(),
  })),
];
