import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"
import {
  DEFAULT_WORKER_SCRAPER_SETTINGS,
  workerScraperSettingSchema,
} from "@workspace/core/validators"
import { SettingModel } from "@workspace/db/models"
import {
  getWorkerScraperSettings,
  saveWorkerScraperSettings,
} from "../src/services/settings/worker-scraper-setting.service"

afterEach(() => mock.restoreAll())

test("worker scraper setting supports only unique MissAV locales", () => {
  assert.equal(
    workerScraperSettingSchema.safeParse({
      enabled: true,
      missav: { locales: ["th", "ja"] },
    }).success,
    true
  )
  assert.equal(
    workerScraperSettingSchema.safeParse({
      enabled: true,
      missav: { locales: ["th", "th"] },
    }).success,
    false
  )
  assert.equal(
    workerScraperSettingSchema.safeParse({
      enabled: true,
      missav: { locales: ["xx"] },
    }).success,
    false
  )
})

test("missing worker scraper setting loads the enabled default", async () => {
  mock.method(SettingModel, "findOne", (filter: unknown) => {
    assert.deepEqual(filter, { name: "worker_scraper_setting" })
    return { lean: async () => null }
  })
  assert.deepEqual(
    await getWorkerScraperSettings(),
    DEFAULT_WORKER_SCRAPER_SETTINGS
  )
})

test("worker scraper setting is saved as one atomic setting value", async () => {
  const value = { enabled: false, missav: { locales: ["th", "ja"] } }
  const write = mock.method(
    SettingModel,
    "updateOne",
    async (filter: unknown, update: unknown, options: unknown) => {
      assert.deepEqual(filter, { name: "worker_scraper_setting" })
      assert.deepEqual(update, { $set: { value } })
      assert.deepEqual(options, { upsert: true, runValidators: true })
    }
  )
  assert.deepEqual(await saveWorkerScraperSettings(value), value)
  assert.equal(write.mock.callCount(), 1)
})
