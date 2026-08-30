import type { Actor } from "@workspace/core/types";
import { mockVideos } from "./mock-videos";

const actorDetails = [
  ["urban-lens", "Stories from vibrant cities and the people who make them memorable."],
  ["taste-trails", "Discovering local food, one table and one story at a time."],
  ["dev-studio", "Practical technology, product building, and modern development."],
  ["above-earth", "Aerial films from remarkable places around the world."],
  ["creator-lab", "Tools and techniques for independent video creators."],
  ["quiet-room", "Music and atmosphere for focus, rest, and slow days."],
  ["frame-school", "Simple lessons for better photography and filmmaking."],
  ["move-daily", "Approachable movement and fitness for everyday life."],
  ["daily-craft", "Coffee, craft, and thoughtful routines at home."],
  ["open-sky", "Science, astronomy, and stories from the night sky."],
  ["intentional-space", "Calm spaces and practical ideas for focused living."],
  ["trail-notes", "Walking remote trails and sharing every worthwhile view."],
] as const;

export const mockActors: Actor[] = actorDetails.map(([id, bio], index) => {
  const channel = mockVideos.find((video) => video.channel.id === id)!.channel;
  return {
    ...channel,
    bio,
    followerCount: [842000, 603000, 318000, 1400000, 415000, 2400000, 726000, 954000, 521000, 1100000, 387000, 648000][index]!,
    videoCount: [46, 176, 128, 92, 89, 302, 114, 208, 76, 163, 58, 137][index]!,
    coverUrl: mockVideos[index]!.thumbnailUrl,
    isFollowing: index < 3,
  };
});
