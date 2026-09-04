import { Router } from "express"
import { domainSettingSchema } from "@workspace/core/validators"
import {
  authenticateUser,
  requireAdmin,
} from "../middlewares/user-access.middleware"
import {
  getDomainSettings,
  saveDomainSettings,
} from "../services/settings/domain-setting.service"

const router: Router = Router()
router.use(authenticateUser, requireAdmin)
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store")
  next()
})

router.get("/domain", async (_req, res, next) => {
  try {
    res.json({ settings: await getDomainSettings() })
  } catch (error) {
    next(error)
  }
})

router.put("/domain", async (req, res, next) => {
  const parsed = domainSettingSchema.safeParse(req.body)
  if (!parsed.success) {
    res
      .status(400)
      .json({
        error: "Invalid domain settings",
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path[0],
          message: issue.message,
        })),
      })
    return
  }
  try {
    res.json({ settings: await saveDomainSettings(parsed.data) })
  } catch (error) {
    next(error)
  }
})

export default router
