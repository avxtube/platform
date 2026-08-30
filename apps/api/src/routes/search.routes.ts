import { Router, type Request, type Response } from "express";
import { mockActors } from "../data/mock-actors";
import { mockPlaylists } from "../data/mock-playlists";
import { mockShorts } from "../data/mock-shorts";
import { mockVideos } from "../data/mock-videos";

const router: Router = Router();

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function matches(values: string[], query: string) {
  return !query || values.join(" ").toLocaleLowerCase().includes(query);
}

router.get("/", (req: Request, res: Response) => {
  const query = text(req.query.q).trim().toLocaleLowerCase();
  const type = text(req.query.type) || "all";
  const duration = text(req.query.duration) || "any";
  const uploaded = text(req.query.uploaded) || "any";
  const feature = text(req.query.feature) || "any";
  const sort = text(req.query.sort) || "relevance";
  const watched = text(req.query.watched) || "any";

  const filterVideo = (video: (typeof mockVideos)[number], index: number) => {
    if (!matches([video.title, video.description, video.category, video.channel.name, video.channel.handle], query)) return false;
    if (duration === "short" && video.durationSeconds > 180) return false;
    if (duration === "medium" && (video.durationSeconds <= 180 || video.durationSeconds > 1200)) return false;
    if (duration === "long" && video.durationSeconds <= 1200) return false;
    const ageDays = Math.max(0, (Date.now() - new Date(video.publishedAt).getTime()) / 86_400_000);
    if (uploaded === "today" && ageDays > 1) return false;
    if (uploaded === "week" && ageDays > 7) return false;
    if (uploaded === "month" && ageDays > 31) return false;
    if (uploaded === "year" && ageDays > 366) return false;
    if (feature === "4k" && video.viewCount < 500_000) return false;
    if (feature === "captions" && index % 2 !== 0) return false;
    if (watched === "watched" && index % 3 !== 0) return false;
    if (watched === "unwatched" && index % 3 === 0) return false;
    return true;
  };

  const sortItems = <Item extends { viewCount: number; publishedAt: string }>(items: Item[]) => {
    if (sort === "views") return items.sort((a, b) => b.viewCount - a.viewCount);
    if (sort === "latest") return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return items;
  };

  const videos = type === "short" || type === "live" ? [] : sortItems(mockVideos.filter(filterVideo));
  const shorts = type === "video" || type === "live" ? [] : sortItems(mockShorts.filter(filterVideo));
  const actors = type === "all" && query
    ? mockActors.filter((actor) => matches([actor.name, actor.handle, actor.bio], query)).slice(0, 8)
    : [];
  const playlists = type === "all" && query
    ? mockPlaylists.filter((playlist) => matches([playlist.title, playlist.description, playlist.owner], query))
    : [];

  res.status(200).json({ videos, shorts, actors, playlists, total: videos.length + shorts.length + actors.length + playlists.length });
});

export default router;
