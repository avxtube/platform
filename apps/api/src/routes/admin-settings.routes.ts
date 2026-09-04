import { Router } from "express"
import {
  advertHobbyValid,
  domainSettingSchema,
} from "@workspace/core/validators"
import {
  authenticateUser,
  requireAdmin,
} from "../middlewares/user-access.middleware"
import {
  getDomainSettings,
  saveDomainSettings,
} from "../services/settings/domain-setting.service"
import {
  getAdvertSettings,
  saveAdvertSettings,
} from "../services/settings/advert-setting.service"

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

router.get("/adverts", async (_req, res, next) => {
  try {
    res.json({ settings: await getAdvertSettings() })
  } catch (error) {
    next(error)
  }
})

router.put("/adverts", async (req, res, next) => {
  const parsed = advertHobbyValid.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid advert settings",
      issues: parsed.error.issues,
    })
    return
  }
  try {
    res.json({ settings: await saveAdvertSettings(parsed.data) })
  } catch (error) {
    next(error)
  }
})

export default router
