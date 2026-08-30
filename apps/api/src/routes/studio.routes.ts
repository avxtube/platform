import { Router, type Request, type Response } from "express";
import type { StudioOverview } from "@workspace/core/types";
import { mockActors } from "../data/mock-actors";
import { mockVideos } from "../data/mock-videos";

const router: Router = Router();

router.get("/overview", (_req: Request, res: Response) => {
  const overview: StudioOverview = {
    totalViews: mockVideos.reduce((total, video) => total + video.viewCount, 0),
    totalFollowers: mockActors[0]?.followerCount ?? 0,
    totalVideos: mockVideos.length,
    estimatedRevenue: 4820.75,
    recentVideos: mockVideos.slice(0, 5),
  };
  res.status(200).json({ overview });
});

export default router;
