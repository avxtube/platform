import { Router, type Request, type Response } from "express";
import type { CollectionKind } from "@workspace/core/types";
import { mockVideos } from "../data/mock-videos";
import { mockShorts } from "../data/mock-shorts";

const router: Router = Router();
const kinds = new Set<CollectionKind>(["library", "history", "watch-later", "liked"]);

router.get("/:kind", (req: Request<{ kind: string }>, res: Response) => {
  if (!kinds.has(req.params.kind as CollectionKind)) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const kind = req.params.kind as CollectionKind;
  const videos = kind === "history"
    ? [...mockVideos].reverse()
    : kind === "watch-later"
      ? mockVideos.filter((_, index) => index % 3 !== 2)
      : kind === "liked"
        ? mockVideos.filter((_, index) => index % 3 === 0 || index % 5 === 0)
        : mockVideos.filter((_, index) => index % 4 !== 3);

  if (kind === "history") {
    const baseTime = Date.parse("2026-08-30T09:00:00.000Z");
    const shortEntries = mockShorts.slice(0, 8).map((content, index) => ({
      id: `history-short-${content.id}`,
      type: "short" as const,
      watchedAt: new Date(baseTime - index * 18 * 60_000).toISOString(),
      content,
    }));
    const videoEntries = videos.slice(0, 14).map((content, index) => ({
      id: `history-video-${content.id}`,
      type: content.category === "Music" ? "music" as const : index % 6 === 2 ? "podcast" as const : "video" as const,
      watchedAt: new Date(baseTime - (index < 7 ? index * 70 * 60_000 : (24 + index) * 60 * 60_000)).toISOString(),
      content,
    }));
    res.status(200).json({ kind, videos, entries: [...shortEntries, ...videoEntries], total: shortEntries.length + videoEntries.length });
    return;
  }

  res.status(200).json({ kind, videos, total: videos.length });
});

export default router;
