import assert from "node:assert/strict"
import { test } from "node:test"
import { domainSettingSchema } from "@workspace/core/validators"
import { DEFAULT_DOMAIN_SETTING } from "@workspace/core/config"
import { scraperRequestUrl } from "../../admin/src/lib/scraper-url"

test("the three media fields store domains without protocol", () => {
  const values = {
    ...DEFAULT_DOMAIN_SETTING,
    domain_content: "cdn.avxtube.org",
    domain_static: "static.avxtube.org",
    domain_playlist: "playlist.avxtube.org",
  }
  assert.deepEqual(domainSettingSchema.parse(values), values)
})

test("Scraping is stored without trailing slash", () => {
  for (const url_scraping of [
    "http://localhost:8081",
    "http://localhost:8081/",
    "http://localhost:8081///",
  ]) {
    assert.equal(
      domainSettingSchema.parse({ ...DEFAULT_DOMAIN_SETTING, url_scraping })
        .url_scraping,
      "http://localhost:8081"
    )
  }
})

test("base URL from settings receives /scraper and an encoded target parameter", () => {
  const target = "https://example.com/video?a=1&b=2#part"
  const result = scraperRequestUrl("http://localhost:8081/", target)
  assert.ok(result)
  assert.equal(result.origin, "http://localhost:8081")
  assert.equal(result.pathname, "/scraper")
  assert.deepEqual([...result.searchParams], [["url", target]])
  assert.equal(result.hash, "")
})

test("legacy endpoint settings do not append /scraper twice", () => {
  for (const endpoint of [
    "http://localhost:8081/scraper",
    "http://localhost:8081/scraper/",
  ]) {
    assert.equal(
      scraperRequestUrl(endpoint, "https://example.com")?.pathname,
      "/scraper"
    )
  }
  assert.equal(
    scraperRequestUrl("https://scraper.example.com/api/", "https://example.com")
      ?.pathname,
    "/api/scraper"
  )
})

test("blank settings cannot create an import request and changed settings change destination", () => {
  assert.equal(scraperRequestUrl("", "https://example.com"), null)
  assert.equal(
    scraperRequestUrl("http://first.example.com:8081", "https://example.com")
      ?.hostname,
    "first.example.com"
  )
  assert.equal(
    scraperRequestUrl("http://second.example.com:8081", "https://example.com")
      ?.hostname,
    "second.example.com"
  )
})

test("scraper configuration cannot embed credentials or inject query parameters", () => {
  for (const value of [
    "file:///local",
    "http://user:pass@localhost:8081",
    "http://localhost:8081?url=https://evil.test",
  ]) {
    assert.throws(() => scraperRequestUrl(value, "https://example.com"))
  }
})
