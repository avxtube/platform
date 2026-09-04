import { Router, type NextFunction, type Request, type Response } from "express"

import {
  getPublicVideoCategories,
  getPublicContents,
  getContentMappers,
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
    if (categoryId) filter.termIds = categoryId
    const [contents, shortContents, { mapVideo, mapShort }] = await Promise.all(
      [
        getPublicContents(filter, requestedCategory === "all" ? 24 : 48),
        requestedCategory === "all"
          ? getPublicContents(publicVideoFilter("short"), 10)
          : [],
        getContentMappers(),
      ]
    )
    const videos = contents.map(mapVideo)

    res.status(200).json({
      categories,
      videos,
      shorts: shortContents.map(mapShort),
      playlists: [],
    })
  } catch (error) {
    next(error)
  }
})

export default router
