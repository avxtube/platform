import { Router, type Request, type Response } from "express";
import { mockFollowing } from "../data/mock-following";
import { mockVideos } from "../data/mock-videos";

const router: Router = Router();

function paginate<Item>(items: Item[], cursorValue: unknown, limitValue: unknown) {
  const cursor = Math.max(0, Number.parseInt(typeof cursorValue === "string" ? cursorValue : "0", 10) || 0);
  const limit = Math.max(1, Math.min(Number.parseInt(typeof limitValue === "string" ? limitValue : "8", 10) || 8, 12));
  const pageItems = items.slice(cursor, cursor + limit);
  const nextOffset = cursor + pageItems.length;
  return { items: pageItems, nextCursor: nextOffset < items.length ? String(nextOffset) : null, total: items.length };
}

router.get("/feed", (req: Request, res: Response) => {
  const followedIds = new Set(mockFollowing.map((profile) => profile.id));
  const videos = mockVideos.filter((video) => followedIds.has(video.channel.id));
  res.status(200).json(paginate(videos, req.query.cursor, req.query.limit));
});

router.get("/", (req: Request, res: Response) => {
  const cursor = Math.max(0, Number.parseInt(typeof req.query.cursor === "string" ? req.query.cursor : "0", 10) || 0);
  const requestedLimit = Number.parseInt(typeof req.query.limit === "string" ? req.query.limit : "3", 10) || 3;
  const limit = Math.max(1, Math.min(requestedLimit, 10));
  const items = mockFollowing.slice(cursor, cursor + limit);
  const nextOffset = cursor + items.length;
  res.status(200).json({ items, nextCursor: nextOffset < mockFollowing.length ? String(nextOffset) : null, total: mockFollowing.length });
});

export default router;
