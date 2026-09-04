import type {
  CollectionKind,
  HistoryEntry,
  Video,
} from "@workspace/core/types"
import { UserContentActivityModel } from "@workspace/db/models"
import { Router, type NextFunction, type Request, type Response } from "express"

import {
  authenticateUser,
  getRequestActor,
} from "../middlewares/user-access.middleware"
import {
  getPublicContents,
  getContentMappers,
  publicVideoFilter,
  stringValue,
} from "../services/content-video.service"

const router: Router = Router()
const kinds = new Set<CollectionKind>([
  "library",
  "history",
  "watch-later",
  "liked",
])

router.use(authenticateUser)

router.get(
  "/:kind",
  async (
    req: Request<{ kind: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!kinds.has(req.params.kind as CollectionKind)) {
        res.status(404).json({ error: "Collection not found" })
        return
      }
      const kind = req.params.kind as CollectionKind
      const userId = getRequestActor(res).id
      const rows = await UserContentActivityModel.find(
        activityFilter(userId, kind)
      )
        .sort(kind === "history" ? { watchedAt: -1 } : { updatedAt: -1 })
        .limit(500)
        .lean()
      const contentIds = rows.map((row) => row.contentId)
      const { mapVideo } = await getContentMappers()
      const contents = contentIds.length
        ? await getPublicContents(
            { ...publicVideoFilter(), _id: { $in: contentIds } },
            contentIds.length
          )
        : []
      const videosById = new Map<string, Video>(
        contents.map((content) => [stringValue(content._id), mapVideo(content)])
      )
      const ordered = rows.flatMap((row) => {
        const video = videosById.get(row.contentId)
        return video ? [{ row, video }] : []
      })
      const videos = ordered.map((item) => item.video)

      if (kind === "history") {
        const entries: HistoryEntry[] = ordered.map(({ row, video }) => ({
          id: row._id,
          type: "video",
          watchedAt: row.watchedAt?.toISOString() ?? row.updatedAt.toISOString(),
          content: video,
        }))
        res.status(200).json({ kind, videos, entries, total: entries.length })
        return
      }

      res.status(200).json({ kind, videos, total: videos.length })
    } catch (error) {
      next(error)
    }
  }
)

router.delete(
  "/history",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await UserContentActivityModel.updateMany(
        { userId: getRequestActor(res).id, watchedAt: { $exists: true } },
        { $unset: { watchedAt: 1 } }
      )
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  }
)

router.delete(
  "/history/:activityId",
  async (
    req: Request<{ activityId: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await UserContentActivityModel.updateOne(
        { _id: req.params.activityId, userId: getRequestActor(res).id },
        { $unset: { watchedAt: 1 } }
      )
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  }
)

function activityFilter(
  userId: string,
  kind: CollectionKind
): Record<string, unknown> {
  if (kind === "history") return { userId, watchedAt: { $exists: true } }
  if (kind === "watch-later") return { userId, watchLater: true }
  if (kind === "liked") return { userId, reaction: "like" }
  return {
    userId,
    $or: [{ saved: true }, { watchLater: true }, { reaction: "like" }],
  }
}

export default router
