import { Router, type Request, type Response } from "express";
import { mockActors } from "../data/mock-actors";
import { mockVideos } from "../data/mock-videos";

const router: Router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ actors: mockActors, total: mockActors.length });
});

router.get("/:handle", (req: Request<{ handle: string }>, res: Response) => {
  const normalized = req.params.handle.replace(/^@/, "").toLowerCase();
  const actor = mockActors.find((item) => item.handle.replace(/^@/, "").toLowerCase() === normalized);
  if (!actor) {
    res.status(404).json({ error: "Actor not found" });
    return;
  }
  res.status(200).json({
    actor,
    videos: mockVideos.filter((video) => video.channel.id === actor.id),
  });
});

export default router;
