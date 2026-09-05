import assert from "node:assert/strict"
import { test } from "node:test"
import {
  contentPagePipeline,
  mapContentToVideo,
  normalizeContentLocale,
  publicVideoFilter,
} from "../src/services/content-video.service"

const content = {
  _id: "content-id",
  slug: "example-video",
  title: "English title",
  description: "<p>English description</p>",
  createdAt: new Date("2026-09-05T00:00:00.000Z"),
  metadata: { releaseDate: "2024-03-02" },
  translated: {
    th: {
      locale: "th",
      title: "ชื่อภาษาไทย",
      description: "<p>คำอธิบายภาษาไทย</p>",
    },
  },
}

test("viewer mapper selects a requested translation with per-field English fallback", () => {
  const thai = mapContentToVideo(content, "", "", "th")
  assert.equal(thai.title, "ชื่อภาษาไทย")
  assert.equal(thai.description, "คำอธิบายภาษาไทย")
  assert.equal(thai.publishedAt, "2024-03-02T00:00:00.000Z")

  const missing = mapContentToVideo(content, "", "", "ja")
  assert.equal(missing.title, "English title")
  assert.equal(missing.description, "English description")

  const partial = structuredClone(content)
  partial.translated.th.title = ""
  assert.equal(mapContentToVideo(partial, "", "", "th").title, "English title")
})

test("content locale is normalized and translated is selected by the page query", () => {
  assert.equal(normalizeContentLocale(" TH "), "th")
  assert.equal(normalizeContentLocale("en"), undefined)
  assert.equal(normalizeContentLocale("../../th"), undefined)
  assert.ok(
    contentPagePipeline(publicVideoFilter()).some(
      (stage) => "$project" in stage && stage.$project?.translated === 1
    )
  )
})
