import { Router } from "express"
import { ChannelModel } from "@workspace/db/models"
import { CHANNEL_KINDS, CHANNEL_ROLES } from "@workspace/core/types/channel"
import {
  escapeRegExp,
  getPublicContents,
  getContentMappers,
  publicVideoFilter,
  stringValue,
  toRecord,
  numberValue,
  contentChannelFilter,
} from "../services/content-video.service"
import {
  getPublicChannels,
  mapChannel,
  publicChannelFilter,
} from "../services/channel-viewer.service"

const router: Router = Router()

router.get("/", async (req, res) => {
  const filter = publicChannelFilter()
  const kind = stringValue(req.query.kind)
  const role = stringValue(req.query.role)
  if (kind && !CHANNEL_KINDS.some((value) => value === kind)) {
    res.status(400).json({ error: "Invalid channel kind" })
    return
  }
  if (role && !CHANNEL_ROLES.some((value) => value === role)) {
    res.status(400).json({ error: "Invalid channel role" })
    return
  }
  if (kind) filter.kind = kind
  if (role) filter["metadata.roles"] = role
  const ids = stringValue(req.query.ids)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100)
  if (ids.length) filter._id = { $in: ids }
  const q = stringValue(req.query.q).slice(0, 200)
  if (q) {
    const pattern = new RegExp(escapeRegExp(q), "i")
    filter.$or = [{ name: pattern }, { handle: pattern }]
  }
  const limit = Math.min(
    100,
    Math.max(
      1,
      Number.parseInt(stringValue(req.query.limit), 10) || ids.length || 30
    )
  )
  const offset = Math.max(
    0,
    Number.parseInt(stringValue(req.query.cursor), 10) || 0
  )
  const [rows, total] = await Promise.all([
    getPublicChannels(filter, limit, offset),
    ChannelModel.countDocuments(filter),
  ])
  res.json({
    channels: rows.map(mapChannel),
    total,
    nextCursor:
      offset + rows.length < total ? String(offset + rows.length) : null,
  })
})

router.get("/:handle", async (req, res) => {
  const handle = req.params.handle.replace(/^@/, "").toLowerCase()
  const [row] = await getPublicChannels(
    { ...publicChannelFilter(), $or: [{ handle }, { _id: req.params.handle }] },
    1
  )
  if (!row) {
    res.status(404).json({ error: "Channel not found" })
    return
  }
  const channel = mapChannel(row)
  const { mapVideo, mapShort } = await getContentMappers()
  const [videos, shorts, posts] = await Promise.all(
    ["video", "short", "post"].map((kind) =>
      getPublicContents(
        { ...publicVideoFilter(kind), ...contentChannelFilter(channel.id) },
        48
      )
    )
  )
  res.json({
    channel,
    videos: (videos ?? []).map(mapVideo),
    shorts: (shorts ?? []).map(mapShort),
    playlists: [],
    courses: [],
    posts: (posts ?? []).map((content) => {
      const video = mapVideo(content)
      return {
        id: video.id,
        message: video.description || video.title,
        imageUrl: video.thumbnailUrl || null,
        publishedAt: video.publishedAt,
        likeCount: numberValue(toRecord(content.stats).likeCount),
        commentCount: numberValue(toRecord(content.stats).commentCount),
      }
    }),
  })
})

export default router
