import { Router, type Request, type Response } from "express";
import { mockPlaylists } from "../data/mock-playlists";
import { mockShorts } from "../data/mock-shorts";
import { mockVideos } from "../data/mock-videos";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  const categories = [...new Set(mockVideos.map((video) => video.category))];
  const requestedCategory = typeof req.query.category === "string" ? req.query.category : "all";
  const videos = requestedCategory === "all"
    ? mockVideos
    : mockVideos.filter((video) => video.category === requestedCategory);

  res.status(200).json({
    categories,
    videos,
    shorts: requestedCategory === "all" ? mockShorts.slice(0, 10) : [],
    playlists: requestedCategory === "all" ? mockPlaylists : [],
  });
});

export default router;
