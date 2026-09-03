import { Router, type Request, type Response } from "express"
import { ChannelModel } from "@workspace/db/models"

import { mockChannels } from "../data/mock-channels"
import {
  getMockChannelCourses,
  getMockChannelPosts,
} from "../data/mock-channel-content"
import { mockPlaylists } from "../data/mock-playlists"
import { mockShorts } from "../data/mock-shorts"
import { mockVideos } from "../data/mock-videos"

const router: Router = Router()

router.get("/", async (req: Request, res: Response) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : null
  const query =
    typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""
  const ids = new Set(
    typeof req.query.ids === "string"
      ? req.query.ids
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : []
  )
  const requestedLimit =
    Number.parseInt(
      typeof req.query.limit === "string"
        ? req.query.limit
        : ids.size
          ? String(ids.size)
          : "12",
      10
    ) || 12
  const limit = Math.max(1, Math.min(requestedLimit, ids.size ? 100 : 30))
  const filteredMocks = mockChannels.filter((channel) => {
    if (kind && channel.kind !== kind) return false
    if (ids.size && !ids.has(channel.id)) return false
    if (!query) return true
    return [channel.name, channel.handle, channel.id].some((value) =>
      value.toLowerCase().includes(query)
    )
  })
  const databaseFilter: Record<string, unknown> = { status: { $ne: "deleted" } }
  if (kind) databaseFilter.kind = kind
  if (ids.size) databaseFilter._id = { $in: [...ids] }
  if (query) {
    const pattern = new RegExp(escapeRegExp(query), "i")
    databaseFilter.$or = [
      { name: pattern },
      { handle: pattern },
      { _id: pattern },
    ]
  }
  const databaseChannels = await ChannelModel.find(databaseFilter)
    .limit(limit)
    .lean()
  const channels = [
    ...databaseChannels.map((channel) => ({
      id: channel._id,
      name: channel.name,
      handle: channel.handle,
      avatarUrl: channel.avatarUrl ?? null,
      kind: channel.kind,
    })),
    ...filteredMocks,
  ]
  const uniqueChannels = [
    ...new Map(channels.map((channel) => [channel.id, channel])).values(),
  ]
  res
    .status(200)
    .json({
      channels: uniqueChannels.slice(0, limit),
      total: uniqueChannels.length,
    })
})

router.get("/:handle", (req: Request<{ handle: string }>, res: Response) => {
  const normalized = req.params.handle.replace(/^@/, "").toLowerCase()
  const channel = mockChannels.find(
    (item) => item.handle.toLowerCase() === normalized
  )

  if (!channel) {
    res.status(404).json({ error: "Channel not found" })
    return
  }

  const videos = mockVideos.filter((video) => video.channel.id === channel.id)
  const shorts = mockShorts.filter((short) => short.channel.id === channel.id)
  const playlists = mockPlaylists.filter(
    (playlist) =>
      playlist.owner === channel.name ||
      playlist.items.some((video) => video.channel?.id === channel.id)
  )
  const courses = channel.enabledTabs.includes("courses")
    ? getMockChannelCourses(channel.id)
    : []
  const posts = channel.enabledTabs.includes("posts")
    ? getMockChannelPosts(channel.id)
    : []

  res.status(200).json({ channel, videos, shorts, playlists, courses, posts })
})

export default router

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
