import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"
import { MediaModel } from "@workspace/db/models"
import {
  createMissavMediaImport,
  isMissavPageUrl,
  parseMissavMediaImport,
  type MissavMediaImport,
} from "@workspace/media"
import { registerMissavMedia } from "../src/services/remote-media-import.service"
import {
  isMissavProxyImport,
  registerImportedMissavMedia,
} from "../../admin/src/lib/missav-media-import"

const sourcePageUrl = "https://missav.ai/dm26/th/example-001"
const sourceUrl = "https://surrit.com/example/playlist.m3u8"
const poster = "https://fourhoi.com/example/cover-n.jpg"
const trailer = "https://fourhoi.com/example/preview.mp4"
const sprite = { col: 6, row: 6, width: 300, height: 168, secondsPerImage: 2 }
const video = {
  kind: "hls-blob-master",
  schemaVersion: 1,
  sourceUrl,
  variants: [
    {
      id: "720p",
      resolution: { width: 1280, height: 720 },
      media: { segmentCount: 1300 },
    },
  ],
}
const result = {
  url: sourcePageUrl,
  data: {
    sourceUrl: sourcePageUrl,
    m3u8Url: sourceUrl,
    video,
    poster,
    trailer,
    thumbnail: sprite,
  },
}

function makePlan(): MissavMediaImport {
  const plan = createMissavMediaImport(result, "a".repeat(32))
  assert.ok(plan)
  return plan
}

afterEach(() => mock.restoreAll())

test("MissAV creates four assets and retains the HLS and sprite descriptors", () => {
  const plan = makePlan()
  assert.equal(plan.assets.length, 4)
  assert.deepEqual(
    plan.assets.find((asset) => asset.purpose === "video")?.metadata.hls,
    video
  )
  const thumbnail = plan.assets.find((asset) => asset.purpose === "thumbnail")
  assert.deepEqual(thumbnail?.metadata.sprite, sprite)
  assert.equal(
    thumbnail?.sourceUrl,
    undefined,
    "Do not invent a sprite URL from the poster"
  )
})

test("other sources and spoofed parser names retain the legacy path", () => {
  assert.equal(
    createMissavMediaImport(
      {
        parser: "MissAV Parser",
        url: "https://example.com/video",
        data: { poster },
      },
      "a".repeat(32)
    ),
    null
  )
  assert.equal(isMissavPageUrl("https://missav.ai.evil.test/video"), false)
  assert.equal(
    isMissavPageUrl("https://evil.test/?url=https://missav.ai/video"),
    false
  )
  assert.equal(isMissavPageUrl("https://user:pass@missav.ai/video"), false)
  assert.equal(isMissavPageUrl("https://missav.ai:8443/video"), false)
  assert.equal(isMissavPageUrl("https://www.missav.ai/video"), true)
})

test("older scraper output without video or thumbnail remains supported", () => {
  const plan = createMissavMediaImport(
    { data: { sourceUrl: sourcePageUrl, m3u8Url: sourceUrl, poster, trailer } },
    "b".repeat(32)
  )
  assert.equal(plan?.assets.length, 3)
  assert.equal(
    plan?.assets.find((asset) => asset.purpose === "video")?.sourceUrl,
    sourceUrl
  )
})

test("descriptor-only media is kept pending rather than dropped", () => {
  const plan = createMissavMediaImport(
    {
      url: sourcePageUrl,
      data: {
        video: { kind: "hls-blob-master", variants: [] },
        thumbnail: sprite,
      },
    },
    "a".repeat(32)
  )
  assert.equal(plan?.assets.length, 2)
  assert.ok(plan?.assets.every((asset) => !asset.sourceUrl))
})

test("rejects duplicate purposes, foreign origins, and oversized descriptors", () => {
  const plan = makePlan()
  assert.throws(
    () =>
      parseMissavMediaImport({
        ...plan,
        assets: [plan.assets[0], plan.assets[0]],
      }),
    /Duplicate/
  )
  assert.throws(
    () =>
      parseMissavMediaImport({
        ...plan,
        assets: [{ purpose: "poster", sourceUrl: "http://127.0.0.1/private" }],
      }),
    /allowed/
  )
  assert.throws(
    () =>
      parseMissavMediaImport({
        ...plan,
        assets: [
          {
            purpose: "thumbnail",
            metadata: { sprite: { value: "x".repeat(1_000_001) } },
          },
        ],
      }),
    /too large/
  )
})

test("registration never fetches assets and writes remote metadata with stable IDs", async () => {
  const writes: Array<Record<string, unknown>> = []
  mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected asset download")
  })
  mock.method(
    MediaModel,
    "updateOne",
    async (
      _filter: unknown,
      update: { $setOnInsert: Record<string, unknown> }
    ) => {
      writes.push(update.$setOnInsert)
    }
  )
  const first = await registerMissavMedia(makePlan(), "admin-test")
  const second = await registerMissavMedia(makePlan(), "admin-test")
  assert.deepEqual(first, second)
  assert.equal(Object.keys(first).length, 4)
  for (const record of writes) {
    assert.equal(record.provider, "remote")
    const metadata = record.metadata
    assert.ok(metadata && typeof metadata === "object")
    assert.equal(Reflect.get(metadata, "sourceProvider"), "missav")
    assert.equal(Reflect.get(metadata, "sourcePageUrl"), sourcePageUrl)
    assert.equal(Reflect.get(metadata, "referrerUrl"), "https://missav.ai/")
    if (record.purpose === "video") assert.equal(record.quality, "720")
    assert.equal(record.storageId, undefined)
    assert.equal(record.key, undefined)
    assert.equal(record.url, undefined)
  }
})

test("each video quality is registered as its own media and all IDs return to the editor", async () => {
  const writes: Array<Record<string, unknown>> = []
  mock.method(
    MediaModel,
    "updateOne",
    async (
      _filter: unknown,
      update: { $setOnInsert: Record<string, unknown> }
    ) => writes.push(update.$setOnInsert)
  )
  const plan = makePlan()
  const asset = plan.assets.find((item) => item.purpose === "video")
  assert.ok(asset)
  asset.metadata.hls = {
    ...video,
    variants: [
      {
        id: "360p",
        resolution: { width: 640, height: 360 },
        media: { segmentCount: 100 },
      },
      {
        id: "480p",
        resolution: { width: 854, height: 480 },
        media: { segmentCount: 100 },
      },
      {
        id: "720p",
        resolution: { width: 1280, height: 720 },
        media: { segmentCount: 100 },
      },
      {
        id: "1080p",
        resolution: { width: 1920, height: 1080 },
        media: { segmentCount: 100, runs: [{ duration: 4, from: 0, to: 99 }] },
      },
    ],
  }
  const result = await registerMissavMedia(plan, "admin")
  assert.ok(Array.isArray(result.videoMediaId))
  assert.equal(result.videoMediaId.length, 4)
  const renditions = writes.filter((item) => item.purpose === "video")
  assert.deepEqual(
    renditions.map((item) => item.quality),
    ["360", "480", "720", "1080"]
  )
  for (const rendition of renditions) {
    const metadata = rendition.metadata
    assert.ok(metadata && typeof metadata === "object")
    const hls = Reflect.get(metadata, "hls")
    assert.equal(hls.variants, undefined)
    assert.equal(hls.master, undefined)
    assert.equal(hls.schemaVersion, undefined)
    assert.equal(hls.id, `${rendition.quality}p`)
    assert.equal(String(hls.resolution.height), rendition.quality)
    assert.equal(hls.media.segmentCount, 100)
    if (rendition.quality === "1080") {
      assert.deepEqual(hls.media.runs, [{ duration: 4, from: 0, to: 99 }])
    }
    assert.equal(Reflect.get(metadata, "directUrl"), sourceUrl)
  }
})

test("thumbnail secondsPerImage rounds to the nearest integer without changing other sprite data", async () => {
  const writes: Array<Record<string, unknown>> = []
  mock.method(
    MediaModel,
    "updateOne",
    async (
      _filter: unknown,
      update: { $setOnInsert: Record<string, unknown> }
    ) => writes.push(update.$setOnInsert)
  )
  for (const [secondsPerImage, expected] of [
    [1.9995872884853487, 2],
    [2.4, 2],
    [2.5, 3],
    [2, 2],
  ]) {
    const plan = makePlan()
    const thumbnail = plan.assets.find((asset) => asset.purpose === "thumbnail")
    assert.ok(thumbnail)
    const originalSprite = { ...sprite, secondsPerImage }
    thumbnail.metadata.sprite = originalSprite
    plan.assets = [thumbnail]
    await registerMissavMedia(plan, "admin")
    const metadata = writes.at(-1)?.metadata
    assert.ok(metadata && typeof metadata === "object")
    assert.deepEqual(Reflect.get(metadata, "sprite"), {
      ...sprite,
      secondsPerImage: expected,
    })
    assert.equal(originalSprite.secondsPerImage, secondsPerImage)
  }
})

test("invalid batches fail before any database writes", async () => {
  const update = mock.method(MediaModel, "updateOne", async () => {
    throw new Error("Unexpected database write")
  })
  await assert.rejects(
    registerMissavMedia(
      {
        ...makePlan(),
        assets: [{ purpose: "video", sourceUrl: "https://evil.test/file" }],
      },
      "admin-test"
    ),
    /allowed/
  )
  assert.equal(update.mock.callCount(), 0)
})

test("legacy metadata skips remote registration entirely", async () => {
  const fetch = mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected request")
  })
  const metadata = { sourceUrl: "https://example.com/video.mp4" }
  assert.equal(await registerImportedMissavMedia(metadata, null), metadata)
  assert.equal(fetch.mock.callCount(), 0)
})

test("manual replacements are excluded, source URLs are retained, and only IDs are merged", async () => {
  mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "/api/v1/admin/media/register-missav")
    assert.equal(typeof init.body, "string")
    const input = JSON.parse(String(init.body))
    assert.deepEqual(
      input.assets.map((asset: { purpose: string }) => asset.purpose),
      ["video", "trailer", "thumbnail"]
    )
    return Response.json({
      mediaIds: {
        videoMediaId: "video-id",
        trailerMediaId: "trailer-id",
        thumbnailMediaId: "sprite-id",
      },
    })
  })
  const metadata = await registerImportedMissavMedia(
    {
      sourceUrl,
      thumbnailUrl: "/uploaded/new.webp",
      trailerUrl: trailer,
      posterMediaId: "old-poster",
    },
    makePlan()
  )
  assert.equal(metadata.sourceUrl, sourceUrl)
  assert.equal(metadata.thumbnailUrl, "/uploaded/new.webp")
  assert.equal(metadata.videoMediaId, "video-id")
  assert.equal(metadata.posterMediaId, undefined)
  assert.equal(metadata.hls, undefined)
})

test("registration failure or missing IDs prevents proceeding to relation creation", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "registration failed" }, { status: 503 })
  )
  await assert.rejects(
    registerImportedMissavMedia(
      { sourceUrl, thumbnailUrl: poster, trailerUrl: trailer },
      makePlan()
    ),
    /registration failed/
  )
  mock.restoreAll()
  mock.method(globalThis, "fetch", async () => Response.json({ mediaIds: {} }))
  await assert.rejects(
    registerImportedMissavMedia({ sourceUrl }, makePlan()),
    /Missing imported media ID/
  )
})

test("saved proxy imports remain distinguishable when reopening the editor", () => {
  assert.equal(
    isMissavProxyImport({
      import: { sourceUrl: sourcePageUrl, mediaMode: "proxy" },
    }),
    true
  )
  assert.equal(
    isMissavProxyImport({ import: { sourceUrl: sourcePageUrl } }),
    false
  )
  assert.equal(
    isMissavProxyImport({
      import: { sourceUrl: "https://example.com/video", mediaMode: "proxy" },
    }),
    false
  )
})
