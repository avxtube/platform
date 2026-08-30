import { Router, type Request, type Response } from "express";

import { mockChannels } from "../data/mock-channels";
import { getMockChannelCourses, getMockChannelPosts } from "../data/mock-channel-content";
import { mockPlaylists } from "../data/mock-playlists";
import { mockShorts } from "../data/mock-shorts";
import { mockVideos } from "../data/mock-videos";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : null;
  const channels = kind ? mockChannels.filter((channel) => channel.kind === kind) : mockChannels;
  res.status(200).json({ channels, total: channels.length });
});

router.get("/:handle", (req: Request<{ handle: string }>, res: Response) => {
  const normalized = req.params.handle.replace(/^@/, "").toLowerCase();
  const channel = mockChannels.find((item) => item.handle.toLowerCase() === normalized);

  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  const videos = mockVideos.filter((video) => video.channel.id === channel.id);
  const shorts = mockShorts.filter((short) => short.channel.id === channel.id);
  const playlists = mockPlaylists.filter(
    (playlist) => playlist.owner === channel.name || playlist.items.some((video) => video.channel.id === channel.id),
  );
  const courses = channel.enabledTabs.includes("courses") ? getMockChannelCourses(channel.id) : [];
  const posts = channel.enabledTabs.includes("posts") ? getMockChannelPosts(channel.id) : [];

  res.status(200).json({ channel, videos, shorts, playlists, courses, posts });
});

export default router;
