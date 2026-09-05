import assert from "node:assert/strict"
import { test } from "node:test"

import { fetchImportedTranslations } from "../../admin/src/lib/video-translations"

test("admin import loads configured translations sequentially and skips missing locales", async () => {
  const requested: string[] = []
  const request = async (input: string | URL | Request) => {
    const url = new URL(String(input), "http://admin.test")
    const locale = url.searchParams.get("locale") ?? ""
    requested.push(locale)
    if (locale === "ja")
      return Response.json({ error: "not found" }, { status: 404 })
    return Response.json({
      success: true,
      data: { title: `title-${locale}`, content: `description-${locale}` },
    })
  }

  const translated = await fetchImportedTranslations(
    "https://missav.ai/en/example-001",
    ["th", "ja", "ko"],
    request as typeof fetch
  )

  assert.deepEqual(requested, ["th", "ja", "ko"])
  assert.deepEqual(Object.keys(translated), ["th", "ko"])
  assert.equal(translated.th?.title, "title-th")
  assert.equal(translated.ko?.description, "description-ko")
})
