import { randomUUID } from "node:crypto"
import { ChannelModel, SubscriptionModel } from "@workspace/db/models"
import { Router, type Request, type Response } from "express"
import {
  authenticateUser,
  getRequestActor,
} from "../middlewares/user-access.middleware"
import {
  getUserFollowingFeed,
  getUserFollowingProfiles,
} from "../services/following.service"

const router: Router = Router()

function pageNumber(value: unknown, fallback: number) {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

router.use(authenticateUser)

router.get("/feed", async (req: Request, res: Response, next) => {
  try {
    const result = await getUserFollowingFeed(
      getRequestActor(res).id,
      Math.min(Math.max(pageNumber(req.query.limit, 20), 1), 20)
    )
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

router.get("/", async (req: Request, res: Response, next) => {
  try {
    const cursor = Math.max(0, pageNumber(req.query.cursor, 0))
    const limit = Math.max(1, Math.min(pageNumber(req.query.limit, 20), 100))
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

router.get("/:channelId/status", async (req: Request, res: Response, next) => {
  try {
    const subscription = await SubscriptionModel.findOne({
      userId: getRequestActor(res).id,
      channelId: req.params.channelId,
    })
      .select("notifications")
      .lean()
    res.status(200).json({
      following: Boolean(subscription),
      notifications: subscription?.notifications ?? "personalized",
    })
  } catch (error) {
    next(error)
  }
})

router.put("/:channelId", async (req: Request, res: Response, next) => {
  try {
    const channelId = req.params.channelId
    const channel = await ChannelModel.findOne({
      _id: channelId,
      status: "active",
      deletedAt: null,
    })
      .select("_id")
      .lean()
    if (!channel) {
      res.status(404).json({ error: "Channel not found" })
      return
    }
    const requested = isRecord(req.body) ? req.body.notifications : undefined
    const notifications =
      requested === "all" || requested === "none" ? requested : "personalized"
    const result = await SubscriptionModel.updateOne(
      { userId: getRequestActor(res).id, channelId },
      {
        $set: { notifications },
        $setOnInsert: {
          _id: randomUUID(),
          userId: getRequestActor(res).id,
          channelId,
        },
      },
      { upsert: true }
    )
    if (result.upsertedCount)
      await ChannelModel.updateOne(
        { _id: channelId },
        { $inc: { "stats.subscriberCount": 1 } }
      )
    res.status(200).json({ following: true, notifications })
  } catch (error) {
    next(error)
  }
})

router.delete("/:channelId", async (req: Request, res: Response, next) => {
  try {
    const result = await SubscriptionModel.deleteOne({
      userId: getRequestActor(res).id,
      channelId: req.params.channelId,
    })
    if (result.deletedCount)
      await ChannelModel.updateOne(
        { _id: req.params.channelId },
        { $inc: { "stats.subscriberCount": -1 } }
      )
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export default router
