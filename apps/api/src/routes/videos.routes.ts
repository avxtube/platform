import { Router, type Request, type Response } from "express";
import { mockVideos } from "../data/mock-videos";
import { mockComments } from "../data/mock-comments";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  if (typeof req.query.cursor === "string" || typeof req.query.limit === "string") {
    const videos = req.query.sort === "trending"
      ? [...mockVideos].sort((left, right) => right.viewCount - left.viewCount)
      : mockVideos;
    res.status(200).json(paginate(videos, req.query.cursor, req.query.limit));
    return;
  }

  res.status(200).json({ videos: mockVideos, total: mockVideos.length });
});

function paginate<Item>(items: Item[], cursorValue: unknown, limitValue: unknown) {
  const cursor = Math.max(0, Number.parseInt(typeof cursorValue === "string" ? cursorValue : "0", 10) || 0);
  const requestedLimit = Number.parseInt(typeof limitValue === "string" ? limitValue : "4", 10) || 4;
  const limit = Math.max(1, Math.min(requestedLimit, 10));
  const pageItems = items.slice(cursor, cursor + limit);
  const nextOffset = cursor + pageItems.length;
  return { items: pageItems, nextCursor: nextOffset < items.length ? String(nextOffset) : null, total: items.length };
}

router.get("/:id/related", (req: Request<{ id: string }>, res: Response) => {
  const video = mockVideos.find((item) => item.id === req.params.id);
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }
  res.status(200).json(paginate(mockVideos.filter((item) => item.id !== video.id), req.query.cursor, req.query.limit));
});

router.get("/:id/comments", (req: Request<{ id: string }>, res: Response) => {
  const video = mockVideos.find((item) => item.id === req.params.id);
  if (!video) { res.status(404).json({ error: "Video not found" }); return; }
  res.status(200).json(paginate(mockComments, req.query.cursor, req.query.limit));
});

router.get("/:id", (req: Request<{ id: string }>, res: Response) => {
  const video = mockVideos.find((item) => item.id === req.params.id);

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const relatedPage = paginate(mockVideos.filter((item) => item.id !== video.id), 0, 4);
  const commentsPage = paginate(mockComments, 0, 4);
  res.status(200).json({
    video,
    relatedVideos: relatedPage.items,
    relatedNextCursor: relatedPage.nextCursor,
    comments: commentsPage.items,
    commentsNextCursor: commentsPage.nextCursor,
  });
});

export default router;
