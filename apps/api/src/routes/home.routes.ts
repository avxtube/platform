import { Router, type Response } from "express";
import { mockPlaylists } from "../data/mock-playlists";
import { mockShorts } from "../data/mock-shorts";
import { mockVideos } from "../data/mock-videos";

const router: Router = Router();

router.get("/", (_req, res: Response) => {
  res.status(200).json({
    videos: mockVideos,
    shorts: mockShorts.slice(0, 10),
    playlists: mockPlaylists,
  });
});

export default router;
