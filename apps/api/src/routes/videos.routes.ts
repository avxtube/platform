import { ContentModel } from "@workspace/db/models"
import { Router, type NextFunction, type Request, type Response } from "express"

import { mockComments } from "../data/mock-comments"
import {
  findPublicVideo,
  mapContentsToVideos,
  publicVideoFilter,
} from "../services/content-video.service"

const router: Router = Router()

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paginated =
      typeof req.query.cursor === "string" ||
      typeof req.query.limit === "string"
    const cursor = nonNegativeInteger(req.query.cursor, 0)
    const limit = paginated ? boundedLimit(req.query.limit, 4) : 100
    const sort: Record<string, 1 | -1> =
      req.query.sort === "trending"
        ? { "stats.viewCount": -1 as const, publishedAt: -1 as const }
        : { publishedAt: -1 as const, createdAt: -1 as const }
    const filter = publicVideoFilter()
    const [contents, total] = await Promise.all([
      ContentModel.find(filter).sort(sort).skip(cursor).limit(limit).lean(),
      ContentModel.countDocuments(filter),
    ])
    const videos = await mapContentsToVideos(
      contents as unknown as Array<Record<string, unknown>>
    )

    if (!paginated) {
      res.status(200).json({ videos, total })
      return
    }
    const nextOffset = cursor + videos.length
    res.status(200).json({
      items: videos,
      nextCursor: nextOffset < total ? String(nextOffset) : null,
      total,
    })
  } catch (error) {
    next(error)
  }
})

router.get(
  "/:id/related",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const video = await findPublicVideo(req.params.id)
      if (!video) {
        res.status(404).json({ error: "Video not found" })
        return
      }
      const cursor = nonNegativeInteger(req.query.cursor, 0)
      const limit = boundedLimit(req.query.limit, 4)
      const filter = { ...publicVideoFilter(), _id: { $ne: video._id } }
      const [contents, total] = await Promise.all([
        ContentModel.find(filter)
          .sort({ publishedAt: -1, createdAt: -1 })
          .skip(cursor)
          .limit(limit)
          .lean(),
        ContentModel.countDocuments(filter),
      ])
      const items = await mapContentsToVideos(
        contents as unknown as Array<Record<string, unknown>>
      )
      const nextOffset = cursor + items.length
      res.status(200).json({
        items,
        nextCursor: nextOffset < total ? String(nextOffset) : null,
        total,
      })
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  "/:id/comments",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const video = await findPublicVideo(req.params.id)
      if (!video) {
        res.status(404).json({ error: "Video not found" })
        return
      }
      res
        .status(200)
        .json(paginateMocks(mockComments, req.query.cursor, req.query.limit))
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const content = await findPublicVideo(req.params.id)
      if (!content) {
        res.status(404).json({ error: "Video not found" })
        return
      }
      const relatedContents = await ContentModel.find({
        ...publicVideoFilter(),
        _id: { $ne: content._id },
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(4)
        .lean()
      const [video] = await mapContentsToVideos([
        content as unknown as Record<string, unknown>,
      ])
      const relatedVideos = await mapContentsToVideos(
        relatedContents as unknown as Array<Record<string, unknown>>
      )
      if (!video) {
        res.status(404).json({ error: "Video not found" })
        return
      }
      res.status(200).json({
        video,
        relatedVideos,
        relatedNextCursor: relatedVideos.length === 4 ? "4" : null,
        comments: mockComments.slice(0, 4),
        commentsNextCursor: mockComments.length > 4 ? "4" : null,
      })
    } catch (error) {
      next(error)
    }
  }
)

function paginateMocks<Item>(
  items: Item[],
  cursorValue: unknown,
  limitValue: unknown
) {
  const cursor = nonNegativeInteger(cursorValue, 0)
  const limit = boundedLimit(limitValue, 4)
  const pageItems = items.slice(cursor, cursor + limit)
  const nextOffset = cursor + pageItems.length
  return {
    items: pageItems,
    nextCursor: nextOffset < items.length ? String(nextOffset) : null,
    total: items.length,
  }
}

function nonNegativeInteger(value: unknown, fallback: number) {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function boundedLimit(value: unknown, fallback: number) {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10)
  return Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : fallback, 50))
}

export default router
