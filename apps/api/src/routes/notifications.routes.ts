import { Router, type Request, type Response } from "express";
import { mockNotifications } from "../data/mock-notifications";

const router: Router = Router();

router.get("/", (req: Request, res: Response) => {
  const cursor = Math.max(0, Number.parseInt(typeof req.query.cursor === "string" ? req.query.cursor : "0", 10) || 0);
  const limit = Math.max(1, Math.min(Number.parseInt(typeof req.query.limit === "string" ? req.query.limit : "6", 10) || 6, 10));
  const notifications = mockNotifications.slice(cursor, cursor + limit);
  const nextOffset = cursor + notifications.length;
  res.status(200).json({
    notifications,
    total: mockNotifications.length,
    nextCursor: nextOffset < mockNotifications.length ? String(nextOffset) : null,
    unreadCount: mockNotifications.filter((item) => item.unread).length,
  });
});

export default router;
