import { ContentModel } from "@workspace/db/models"
import { Router, type NextFunction, type Request, type Response } from "express"

import { mockPlaylists } from "../data/mock-playlists"
import { mockShorts } from "../data/mock-shorts"
import {
  getPublicVideoCategories,
  mapContentsToVideos,
  publicVideoFilter,
  resolveCategoryId,
} from "../services/content-video.service"

const router: Router = Router()

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedCategory =
      typeof req.query.category === "string" ? req.query.category : "all"
    const categoryId = await resolveCategoryId(requestedCategory)
    const categories = await getPublicVideoCategories()

    if (categoryId === null) {
      res
        .status(200)
        .json({ categories, videos: [], shorts: [], playlists: [] })
      return
    }

    const filter: Record<string, unknown> = publicVideoFilter()
    if (categoryId) filter["metadata.categoryIds"] = categoryId
    const contents = await ContentModel.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(requestedCategory === "all" ? 24 : 48)
      .lean()
    const videos = await mapContentsToVideos(
      contents as unknown as Array<Record<string, unknown>>
    )

    res.status(200).json({
      categories,
      videos,
      shorts: requestedCategory === "all" ? mockShorts.slice(0, 10) : [],
      playlists: requestedCategory === "all" ? mockPlaylists : [],
    })
  } catch (error) {
    next(error)
  }
})

export default router
