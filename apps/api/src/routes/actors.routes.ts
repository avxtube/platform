import { Router } from "express"
import { ChannelModel } from "@workspace/db/models"
import {
  getPublicChannels,
  mapActor,
  publicChannelFilter,
} from "../services/channel-viewer.service"
import {
  getPublicContents,
  getContentMappers,
  publicVideoFilter,
  contentChannelFilter,
} from "../services/content-video.service"

const router: Router = Router()
const actorFilter = (): Record<string, unknown> => ({
  ...publicChannelFilter(),
  kind: "person",
  "metadata.roles": "actor",
})
router.get("/", async (_req, res) => {
  const [rows, total] = await Promise.all([
    getPublicChannels(actorFilter(), 100),
    ChannelModel.countDocuments(actorFilter()),
  ])
  res.json({ actors: rows.map(mapActor), total })
})
router.get("/:handle", async (req, res) => {
  const [row] = await getPublicChannels(
    {
      ...actorFilter(),
      handle: req.params.handle.replace(/^@/, "").toLowerCase(),
    },
    1
  )
  if (!row) {
    res.status(404).json({ error: "Actor not found" })
    return
  }
  const actor = mapActor(row)
  const contents = await getPublicContents(
    { ...publicVideoFilter(), ...contentChannelFilter(actor.id) },
    48
  )
  const { mapVideo } = await getContentMappers()
  res.json({ actor, videos: contents.map(mapVideo) })
})
export default router
