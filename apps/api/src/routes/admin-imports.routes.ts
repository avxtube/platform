import { QueueImportModel } from "@workspace/db/models"
import { Router, type NextFunction, type Request, type Response } from "express"

import {
  authenticateUser,
  requireAdmin,
} from "../middlewares/user-access.middleware"
import { importMissavSitemap } from "../services/sitemap-import.service"

const router: Router = Router()

router.use(authenticateUser, requireAdmin)

router.get(
  "/queue",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.max(
        1,
        Math.min(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 200)
      )
      const page = Math.max(
        1,
        Number.parseInt(String(req.query.page ?? "1"), 10) || 1
      )
      const [items, total] = await Promise.all([
        QueueImportModel.find({})
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        QueueImportModel.countDocuments({}),
      ])
      res.status(200).json({
        items,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      })
    } catch (error) {
      next(error)
    }
  }
)

router.post(
  "/sitemap",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isRecord(req.body) || typeof req.body.url !== "string")
        throw invalid("url is required")
      const summary = await importMissavSitemap(req.body.url.trim())
      res.status(200).json({ summary })
    } catch (error) {
      next(error)
    }
  }
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function invalid(message: string) {
  return Object.assign(new Error(message), { name: "ValidationError" })
}

export default router
