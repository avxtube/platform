import { Router, type Request, type Response } from "express";
import { mockShorts } from "../data/mock-shorts";
import { mockComments } from "../data/mock-comments";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  const page = Math.max(1, Number.parseInt(typeof req.query.page === "string" ? req.query.page : "1", 10) || 1);
  const pageSize = Math.max(1, Math.min(Number.parseInt(typeof req.query.pageSize === "string" ? req.query.pageSize : "5", 10) || 5, 10));
  const start = (page - 1) * pageSize;
  const items = mockShorts.slice(start, start + pageSize);
  res.status(200).json({ items, shorts: items, page, pageSize, nextPage: start + items.length < mockShorts.length ? page + 1 : null, total: mockShorts.length });
});

router.get("/:id/comments", (req: Request<{ id: string }>, res: Response) => {
  const short = mockShorts.find((item) => item.id === req.params.id);
  if (!short) { res.status(404).json({ error: "Short not found" }); return; }
  const cursor = Math.max(0, Number.parseInt(typeof req.query.cursor === "string" ? req.query.cursor : "0", 10) || 0);
  const limit = Math.max(1, Math.min(Number.parseInt(typeof req.query.limit === "string" ? req.query.limit : "4", 10) || 4, 10));
  const items = mockComments.slice(cursor, cursor + limit);
  const nextOffset = cursor + items.length;
  res.status(200).json({ items, nextCursor: nextOffset < mockComments.length ? String(nextOffset) : null, total: mockComments.length });
});

router.get("/:id", (req: Request<{ id: string }>, res: Response) => {
  const short = mockShorts.find((item) => item.id === req.params.id);
  if (!short) {
    res.status(404).json({ error: "Short not found" });
    return;
  }
  res.status(200).json({ short });
});

export default router;
