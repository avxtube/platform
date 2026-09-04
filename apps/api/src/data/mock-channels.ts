import type { Channel, ChannelTabId } from "@workspace/core/types";

import { mockActors } from "./mock-actors";
import { mockShorts } from "./mock-shorts";
import { mockVideos } from "./mock-videos";

const kindById: Record<string, "actor" | "studio" | "creator"> = {
  "urban-lens": "actor",
  "taste-trails": "actor",
  "dev-studio": "studio",
  "above-earth": "studio",
  "creator-lab": "studio",
  "quiet-room": "actor",
  "frame-school": "studio",
  "move-daily": "actor",
  "daily-craft": "creator",
  "open-sky": "creator",
  "intentional-space": "creator",
  "trail-notes": "actor",
};

const channelVariants: Record<string, {
  layout: Channel["layout"];
  tabs: ChannelTabId[];
  defaultTab: ChannelTabId;
  membership: boolean;
}> = {
  "urban-lens": { layout: "compact", tabs: ["videos", "playlists", "posts"], defaultTab: "videos", membership: false },
  "taste-trails": { layout: "compact", tabs: ["videos", "shorts", "playlists", "posts"], defaultTab: "videos", membership: false },
  "quiet-room": { layout: "compact", tabs: ["videos", "playlists", "posts"], defaultTab: "videos", membership: true },
  "move-daily": { layout: "compact", tabs: ["home", "videos", "shorts", "posts"], defaultTab: "home", membership: true },
  "trail-notes": { layout: "compact", tabs: ["videos", "shorts", "playlists"], defaultTab: "videos", membership: false },
  "dev-studio": { layout: "banner", tabs: ["home", "videos", "shorts", "courses", "playlists", "posts", "about"], defaultTab: "home", membership: true },
  "creator-lab": { layout: "banner", tabs: ["home", "videos", "shorts", "courses", "playlists", "posts"], defaultTab: "home", membership: true },
};

export const mockChannels: Channel[] = mockActors.map((actor, index) => {
  const kind = kindById[actor.id] ?? "creator";
  const videos = mockVideos.filter((video) => video.channel.id === actor.id);
  const shorts = mockShorts.filter((short) => short.channel?.id === actor.id);
  const topics = [...new Set(videos.map((video) => video.category))];
  const variant = channelVariants[actor.id] ?? {
    layout: "banner" as const,
    tabs: ["home", "videos", "shorts", "playlists", "posts", "about"] satisfies ChannelTabId[],
    defaultTab: "home" as const,
    membership: false,
  };

  return {
    id: actor.id,
    kind: kind === "studio" ? "organization" : "person",
    layout: variant.layout,
    enabledTabs: variant.tabs,
    defaultTab: variant.defaultTab,
    membershipEnabled: variant.membership,
    name: actor.name,
    handle: actor.handle.replace(/^@/, ""),
    description: actor.bio,
    avatarUrl: actor.coverUrl,
    bannerUrl: variant.layout === "banner" ? actor.coverUrl : null,
    country: index % 3 === 0 ? "TH" : index % 3 === 1 ? "US" : null,
    verified: actor.verified,
    subscriberCount: actor.followerCount,
    videoCount: videos.length,
    shortCount: shorts.length,
    viewCount: videos.reduce((total, video) => total + video.viewCount, 0),
    joinedAt: new Date(Date.UTC(2022 + (index % 3), index % 12, 4 + index)).toISOString(),
    isFollowing: actor.isFollowing,
    links: [{ label: actor.name, url: `https://avxtube.org/channel/${actor.handle.replace(/^@/, "")}` }],
    metadata: kind === "actor"
      ? { roles: [kind], stageName: actor.name, nationality: index % 2 === 0 ? "Thai" : null, genres: topics }
      : kind === "studio"
        ? { roles: [kind], legalName: `${actor.name} Co., Ltd.`, foundedYear: 2018 + (index % 6), specialties: topics }
        : { roles: [kind], topics },
  };
});
