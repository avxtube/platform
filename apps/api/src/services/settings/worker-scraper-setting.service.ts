import {
  DEFAULT_WORKER_SCRAPER_SETTINGS,
  workerScraperSettingSchema,
} from "@workspace/core/validators"
import { SettingModel } from "@workspace/db/models"

const name = "worker_scraper_setting"

export async function getWorkerScraperSettings() {
  const setting = await SettingModel.findOne({ name }).lean()
  return workerScraperSettingSchema
    .strip()
    .parse(setting?.value ?? DEFAULT_WORKER_SCRAPER_SETTINGS)
}

export async function saveWorkerScraperSettings(input: unknown) {
  const settings = workerScraperSettingSchema.parse(input)
  await SettingModel.updateOne(
    { name },
    { $set: { value: settings } },
    { upsert: true, runValidators: true }
  )
  return settings
}
