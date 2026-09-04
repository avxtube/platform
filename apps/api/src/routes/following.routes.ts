import { Router, type Request, type Response } from "express"
import {
  authenticateUser,
  getRequestActor,
} from "../middlewares/user-access.middleware"
import { getUserFollowingProfiles } from "../services/following.service"
import { mockFollowing } from "../data/mock-following"
import { mockVideos } from "../data/mock-videos"

const router: Router = Router()

function pageNumber(value: unknown, fallback: number) {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function paginate<Item>(items: Item[], cursorValue: unknown, limitValue: unknown) {
  const cursor = Math.max(0, pageNumber(cursorValue, 0))
  const limit = Math.max(1, Math.min(pageNumber(limitValue, 8), 12))
  const pageItems = items.slice(cursor, cursor + limit)
  const nextOffset = cursor + pageItems.length
  return { items: pageItems, nextCursor: nextOffset < items.length ? String(nextOffset) : null, total: items.length }
}

router.get("/feed", (req: Request, res: Response) => {
  const followedIds = new Set(mockFollowing.map((profile) => profile.id))
  const videos = mockVideos.filter((video) => followedIds.has(video.channel.id))
  res.status(200).json(paginate(videos, req.query.cursor, req.query.limit))
})

router.get("/", authenticateUser, async (req: Request, res: Response, next) => {
  try {
    const cursor = Math.max(0, pageNumber(req.query.cursor, 0))
    const limit = Math.max(1, Math.min(pageNumber(req.query.limit, 3), 10))
    const result = await getUserFollowingProfiles(
      getRequestActor(res).id,
      cursor,
      limit
    )
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

export default router
