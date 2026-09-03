import { Router, type NextFunction, type Request, type Response } from "express"

import { openStoredMedia } from "../services/media-storage.service"

const router: Router = Router()

router.get(
  "/files/:storageId/*key",
  async (
    req: Request<{ storageId: string; key: string[] }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const key = Array.isArray(req.params.key)
        ? req.params.key.join("/")
        : String(req.params.key ?? "")
      if (!key) {
        res.status(404).end()
        return
      }
      const range = parseRange(req.headers.range)
      const media = await openStoredMedia(req.params.storageId, key, range)
      if (range) res.status(206)
      res.setHeader("content-type", media.mimeType)
      res.setHeader("cache-control", "public, max-age=31536000, immutable")
      res.setHeader("accept-ranges", "bytes")
      if (media.size !== undefined)
        res.setHeader("content-length", String(media.size))
      if (media.contentRange) res.setHeader("content-range", media.contentRange)
      media.body.on("error", (error: Error) => {
        media.client?.destroy()
        res.destroy(error)
      })
      media.body.pipe(res)
      res.on("close", () => media.client?.destroy())
    } catch (error) {
      next(error)
    }
  }
)

function parseRange(value: string | undefined) {
  if (!value) return undefined
  const match = /^bytes=(\d+)-(\d*)$/.exec(value.trim())
  if (!match) throw Object.assign(new Error("Invalid range"), { status: 416 })
  const start = Number(match[1])
  const end = match[2] ? Number(match[2]) : undefined
  if (
    !Number.isSafeInteger(start) ||
    (end !== undefined && !Number.isSafeInteger(end))
  )
    throw Object.assign(new Error("Invalid range"), { status: 416 })
  return {
    start,
    end,
  }
}

export default router
