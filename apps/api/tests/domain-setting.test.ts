import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"
import { DEFAULT_DOMAIN_SETTING } from "@workspace/core/config"
import { domainSettingSchema } from "@workspace/core/validators"
import { SettingModel } from "@workspace/db/models"
import {
  getDomainSettings,
  saveDomainSettings,
} from "../src/services/settings/domain-setting.service"

afterEach(() => mock.restoreAll())

test("all domain settings are optional values but a save must include the whole group", () => {
  assert.deepEqual(
    domainSettingSchema.parse(DEFAULT_DOMAIN_SETTING),
    DEFAULT_DOMAIN_SETTING
  )
  assert.equal(
    domainSettingSchema.safeParse({ domain_content: "https://example.com" })
      .success,
    false
  )
})

test("legacy origins normalize to bare domains and local ports work", () => {
  const settings = domainSettingSchema.parse({
    ...DEFAULT_DOMAIN_SETTING,
    domain_content: " HTTPS://CDN.Example.com/ ",
    domain_playlist: "http://localhost:3000",
  })
  assert.equal(settings.domain_content, "cdn.example.com")
  assert.equal(settings.domain_playlist, "localhost:3000")
})

test("reject non-HTTP URLs, credentials, malformed URLs, paths, queries and fragments in origins", () => {
  for (const domain_content of [
    "javascript:alert(1)",
    "https:example.com",
    "not a domain",
    "https://admin:secret@example.com",
    "https://example.com/path",
    "https://example.com?key=secret",
    "https://example.com#fragment",
  ]) {
    assert.equal(
      domainSettingSchema.safeParse({
        ...DEFAULT_DOMAIN_SETTING,
        domain_content,
      }).success,
      false,
      domain_content
    )
  }
})

test("scraping supports an internal full endpoint but no credential/query embedding", () => {
  const valid = domainSettingSchema.parse({
    ...DEFAULT_DOMAIN_SETTING,
    url_scraping: "http://127.0.0.1:8081/scraper",
  })
  assert.equal(valid.url_scraping, "http://127.0.0.1:8081/scraper")
  for (const url_scraping of [
    "file:///etc/passwd",
    "http://admin:pass@localhost:8081/scraper",
    "https://example.com/scraper?token=secret",
  ]) {
    assert.equal(
      domainSettingSchema.safeParse({ ...DEFAULT_DOMAIN_SETTING, url_scraping })
        .success,
      false
    )
  }
})

test("retired preview and subdomain fields cannot be saved", () => {
  for (const retired of [
    { domain_preview: "https://preview.example.com" },
    { domain_sub: ["embed.example.com"] },
  ]) {
    assert.equal(
      domainSettingSchema.safeParse({ ...DEFAULT_DOMAIN_SETTING, ...retired })
        .success,
      false
    )
  }
})

test("legacy settings load without retired fields and the next save omits them", async () => {
  const legacy = {
    ...DEFAULT_DOMAIN_SETTING,
    domain_static: "static.example.com",
    domain_preview: "https://preview.example.com",
    domain_sub: ["embed.example.com"],
  }
  mock.method(SettingModel, "findOne", () => ({
    lean: async () => ({ value: legacy }),
  }))
  const expected = {
    ...DEFAULT_DOMAIN_SETTING,
    domain_static: "static.example.com",
  }
  const loaded = await getDomainSettings()
  assert.deepEqual(loaded, expected)
  mock.method(
    SettingModel,
    "updateOne",
    async (_filter: unknown, update: unknown) => {
      assert.deepEqual(update, { $set: { value: expected } })
    }
  )
  assert.deepEqual(await saveDomainSettings(loaded), expected)
})

test("cannot use the domain endpoint to set unrelated or secret configuration", () => {
  assert.equal(
    domainSettingSchema.safeParse({
      ...DEFAULT_DOMAIN_SETTING,
      auth_setting: {},
    }).success,
    false
  )
  assert.equal(
    domainSettingSchema.safeParse({
      ...DEFAULT_DOMAIN_SETTING,
      api_token: "secret",
    }).success,
    false
  )
})

test("missing database settings load defaults without creating a record", async () => {
  const read = mock.method(SettingModel, "findOne", (filter: unknown) => {
    assert.deepEqual(filter, { name: "domain_setting" })
    return { lean: async () => null }
  })
  assert.deepEqual(await getDomainSettings(), DEFAULT_DOMAIN_SETTING)
  assert.equal(read.mock.callCount(), 1)
})

test("saved settings are read back, including cleared values", async () => {
  const settings = {
    ...DEFAULT_DOMAIN_SETTING,
    domain_static: "static.example.com",
  }
  mock.method(SettingModel, "findOne", () => ({
    lean: async () => ({ value: settings }),
  }))
  assert.deepEqual(await getDomainSettings(), settings)
})

test("group save uses one atomic update and never changes other settings", async () => {
  const write = mock.method(
    SettingModel,
    "updateOne",
    async (filter: unknown, update: unknown, options: unknown) => {
      assert.deepEqual(filter, { name: "domain_setting" })
      assert.deepEqual(update, {
        $set: {
          value: {
            ...DEFAULT_DOMAIN_SETTING,
            domain_content: "cdn.example.com",
          },
        },
      })
      assert.deepEqual(options, { upsert: true, runValidators: true })
    }
  )
  await saveDomainSettings({
    ...DEFAULT_DOMAIN_SETTING,
    domain_content: "https://CDN.example.com/",
  })
  assert.equal(write.mock.callCount(), 1)
})

test("validation and storage failures cannot report a successful save", async () => {
  const write = mock.method(SettingModel, "updateOne", async () => {
    throw new Error("Database unavailable")
  })
  await assert.rejects(
    saveDomainSettings({ ...DEFAULT_DOMAIN_SETTING, domain_content: "invalid" })
  )
  assert.equal(write.mock.callCount(), 0)
  await assert.rejects(
    saveDomainSettings(DEFAULT_DOMAIN_SETTING),
    /Database unavailable/
  )
})
