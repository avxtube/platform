import { Router, type Request, type Response } from "express";
import { mockFollowing } from "../data/mock-following";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  const cursor = Math.max(0, Number.parseInt(typeof req.query.cursor === "string" ? req.query.cursor : "0", 10) || 0);
  const requestedLimit = Number.parseInt(typeof req.query.limit === "string" ? req.query.limit : "3", 10) || 3;
  const limit = Math.max(1, Math.min(requestedLimit, 10));
  const items = mockFollowing.slice(cursor, cursor + limit);
  const nextOffset = cursor + items.length;
  res.status(200).json({ items, nextCursor: nextOffset < mockFollowing.length ? String(nextOffset) : null, total: mockFollowing.length });
});

export default router;
