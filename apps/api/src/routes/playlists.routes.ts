import { Router, type Request, type Response } from "express";
import { mockPlaylists } from "../data/mock-playlists";

const router: Router = Router();

router.get("/", (_req, res: Response) => {
  res.status(200).json({ playlists: mockPlaylists, total: mockPlaylists.length });
});

router.get("/:id", (req: Request<{ id: string }>, res: Response) => {
  const playlist = mockPlaylists.find((item) => item.id === req.params.id);
  if (!playlist) {
    res.status(404).json({ error: "Playlist not found" });
    return;
  }
  res.status(200).json({ playlist });
});

export default router;
