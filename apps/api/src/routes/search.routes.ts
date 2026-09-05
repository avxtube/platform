import { Router } from "express"
import {
  ChannelModel,
  ContentModel,
  MediaModel,
  TermModel,
} from "@workspace/db/models"
import {
  getPublicChannels,
  mapActor,
  publicChannelFilter,
} from "../services/channel-viewer.service"
import {
  escapeRegExp,
  getPublicContents,
  getContentMappers,
  normalizeContentLocale,
  publicVideoFilter,
  stringValue,
} from "../services/content-video.service"

const router: Router = Router()
router.get("/", async (req, res) => {
  const q = stringValue(req.query.q).slice(0, 200)
  const locale = normalizeContentLocale(req.query.locale)
  const type = stringValue(req.query.type) || "all"
  const filter: Record<string, unknown> = {
    ...publicVideoFilter(),
    kind:
      type === "live"
        ? "live"
        : type === "video"
          ? "video"
          : type === "short"
            ? "short"
            : { $in: ["video", "short"] },
  }
  const pattern = new RegExp(escapeRegExp(q), "i")
  const channelSearch = {
    ...publicChannelFilter(),
    $or: [{ name: pattern }, { handle: pattern }],
  }
  const profileSearch = {
    ...publicChannelFilter(),
    $and: [
      { $or: [{ name: pattern }, { handle: pattern }] },
      {
        $or: [
          { kind: "person", "metadata.roles": "actor" },
          { kind: "organization", "metadata.roles": "studio" },
        ],
      },
    ],
  }
  if (q) {
    const [channelIds, termIds] = await Promise.all([
      ChannelModel.distinct("_id", channelSearch),
      TermModel.distinct("_id", {
        status: "active",
        deletedAt: null,
        name: pattern,
      }),
    ])
    filter.$or = [
      { title: pattern },
      { description: pattern },
      translatedTextCondition(pattern),
      { studioIds: { $in: channelIds } },
      { actressIds: { $in: channelIds } },
      { actorIds: { $in: channelIds } },
      { directorIds: { $in: channelIds } },
      { channelIds: { $in: channelIds } },
      { termIds: { $in: termIds } },
    ]
  }
  const days: Record<string, number> = {
    today: 1,
    week: 7,
    month: 31,
    year: 366,
  }
  const age = days[stringValue(req.query.uploaded)]
  if (age) filter.createdAt = { $gte: new Date(Date.now() - age * 86400000) }
  const duration = stringValue(req.query.duration)
  const constraints: Record<string, unknown>[] = []
  if (["short", "medium", "long"].includes(duration)) {
    const seconds = {
      $max: [
        { $ifNull: ["$metadata.duration", 0] },
        { $ifNull: ["$metadata.hls.media.duration", 0] },
      ],
    }
    const comparison =
      duration === "short"
        ? { $lte: [seconds, 180] }
        : duration === "long"
          ? { $gt: [seconds, 1200] }
          : { $and: [{ $gt: [seconds, 180] }, { $lte: [seconds, 1200] }] }
    const ids = await MediaModel.distinct("_id", {
      deletedAt: null,
      error: null,
      purpose: { $in: ["video", "short"] },
      $expr: comparison,
    })
    constraints.push({ mediaIds: { $in: ids } })
  }
  const feature = stringValue(req.query.feature)
  if (feature === "4k" || feature === "captions") {
    const ids = await MediaModel.distinct("_id", {
      deletedAt: null,
      error: null,
      ...(feature === "4k"
        ? {
            purpose: { $in: ["video", "short"] },
            "metadata.height": { $gte: 2160 },
          }
        : { kind: "subtitle" }),
    })
    constraints.push({ mediaIds: { $in: ids } })
  }
  if (constraints.length) filter.$and = constraints
  const sort: Record<string, 1 | -1> =
    req.query.sort === "views"
      ? { "stats.viewCount": -1, createdAt: -1, _id: -1 }
      : { createdAt: -1, _id: -1 }
  const [contents, totalContents, actors, { mapVideo, mapShort }] =
    await Promise.all([
      getPublicContents(filter, 50, 0, sort),
      ContentModel.countDocuments(filter),
      type === "all" && q ? getPublicChannels(profileSearch, 8) : [],
      getContentMappers(locale),
    ])
  res.json({
    videos: contents.filter((item) => item.kind === "video").map(mapVideo),
    shorts: contents.filter((item) => item.kind === "short").map(mapShort),
    actors: actors.map(mapActor),
    playlists: [],
    total: totalContents + actors.length,
  })
})

function translatedTextCondition(pattern: RegExp) {
  return {
    $expr: {
      $anyElementTrue: {
        $map: {
          input: { $objectToArray: { $ifNull: ["$translated", {}] } },
          as: "translation",
          in: {
            $or: [
              {
                $regexMatch: {
                  input: { $ifNull: ["$$translation.v.title", ""] },
                  regex: pattern,
                },
              },
              {
                $regexMatch: {
                  input: { $ifNull: ["$$translation.v.description", ""] },
                  regex: pattern,
                },
              },
            ],
          },
        },
      },
    },
  }
}
export default router
