import assert from "node:assert/strict"
import { test } from "node:test"

import { parseMissavSitemap } from "../src/services/sitemap-import.service"

test("keeps only English MissAV items and canonicalizes every MissAV domain", () => {
  const result = parseMissavSitemap(`
    <urlset>
      <url><loc>https://missav.ws/en/fct-206-uncensored-leak</loc></url>
      <url><loc>https://missav.ai/dm31/en/abc-123-english-subtitle</loc></url>
      <url><loc>https://missav.ws/dm32/en/oretd-694</loc></url>
      <url><loc>https://missav.com/th/abc-123</loc></url>
      <url><loc>https://example.com/en/other</loc></url>
      <url><loc>https://missav.ai/en/fct-206-uncensored-leak?ref=duplicate</loc></url>
    </urlset>
  `)
  assert.deepEqual(result.items, [
    {
      slug: "fct-206-uncensored-leak",
      url: "https://missav.ai/en/fct-206-uncensored-leak",
    },
    {
      slug: "oretd-694",
      url: "https://missav.ai/en/oretd-694",
    },
  ])
  assert.deepEqual(result.summary, {
    discovered: 6,
    eligible: 2,
    skippedNonEnglish: 1,
    skippedEnglishSubtitle: 1,
    skippedInvalid: 1,
  })
})

test("decodes XML entities and normalizes the slug used as dvdId", () => {
  const result = parseMissavSitemap(`
    <urlset>
      <url><loc>https://missav.ai/en/FC2-PPV-123?x=1&amp;y=2</loc></url>
    </urlset>
  `)
  assert.equal(result.items[0]?.slug, "fc2-ppv-123")
  assert.equal(result.items[0]?.url, "https://missav.ai/en/fc2-ppv-123")
})
