import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"
import { ChannelModel, MediaModel, TermModel } from "@workspace/db/models"
import {
  channelPositions,
  prepareContentReferences,
  resolveContentRelations,
} from "../src/services/content-relations.service"
import {
  contentEditorReferences,
  editorMetadata,
} from "../../admin/src/lib/content-editor"
import type { AdminContent } from "../../admin/src/lib/content"

afterEach(() => mock.restoreAll())

const content: AdminContent = {
  _id: "content",
  kind: "video",
  status: "draft",
  visibility: "private",
  moderationStatus: "active",
  createdBy: "admin",
  createdAt: "",
  updatedAt: "",
  channelIds: ["studio", "actor2", "actor1", "director"],
  termIds: ["cat2", "cat1", "tag"],
  mediaIds: ["poster", "trailer", "v720", "v360", "sprite"],
  metadata: { dvdId: "test", custom: { keep: true } },
  relations: {
    channels: [
      {
        id: "studio",
        name: "Studio Name",
        handle: "studio",
        avatarUrl: null,
        kind: "organization",
        positions: ["studio"],
      },
      {
        id: "actor2",
        name: "Second Actor",
        handle: "two",
        avatarUrl: null,
        kind: "person",
        positions: ["actors"],
      },
      {
        id: "actor1",
        name: "First Actor",
        handle: "one",
        avatarUrl: null,
        kind: "person",
        positions: ["actors"],
      },
      {
        id: "director",
        name: "Director",
        handle: "director",
        avatarUrl: null,
        kind: "person",
        positions: ["directors"],
      },
    ],
    terms: [
      { id: "cat2", name: "Two", slug: "two", taxonomy: "category" },
      { id: "cat1", name: "One", slug: "one", taxonomy: "category" },
      { id: "tag", name: "Tag", slug: "tag", taxonomy: "tag" },
    ],
    media: [
      {
        id: "poster",
        position: "poster",
        kind: "image",
        provider: "s3",
        url: "https://cdn.test/poster.webp",
      },
      {
        id: "trailer",
        position: "trailer",
        kind: "video",
        provider: "remote",
        url: "https://cdn.test/trailer.mp4",
      },
      {
        id: "v720",
        position: "video",
        quality: "720",
        kind: "video",
        provider: "remote",
        url: "https://cdn.test/master.m3u8",
      },
      {
        id: "v360",
        position: "video",
        quality: "360",
        kind: "video",
        provider: "remote",
        url: "https://cdn.test/master.m3u8",
      },
      {
        id: "sprite",
        position: "thumbnail",
        kind: "image",
        provider: "remote",
        url: null,
      },
    ],
    contents: [],
  },
}

test("editor hydrates channels, terms and media into their API-defined slots", () => {
  const metadata = editorMetadata(content)
  assert.equal(metadata.studioId, "studio")
  assert.deepEqual(metadata.actorIds, ["actor2", "actor1"])
  assert.deepEqual(metadata.categoryIds, ["cat2", "cat1"])
  assert.deepEqual(metadata.tagIds, ["tag"])
  assert.equal(metadata.thumbnailUrl, "https://cdn.test/poster.webp")
  assert.equal(metadata.trailerUrl, "https://cdn.test/trailer.mp4")
  assert.equal(metadata.sourceUrl, "https://cdn.test/master.m3u8")
  assert.deepEqual(metadata.custom, { keep: true })
})

test("normal edits preserve all qualities and unrepresented channels/media", () => {
  const next = contentEditorReferences(
    { ...editorMetadata(content), dvdId: "changed" },
    content
  )
  assert.deepEqual(new Set(next.channelIds), new Set(content.channelIds))
  assert.deepEqual(next.termIds, content.termIds)
  assert.deepEqual(next.mediaIds, content.mediaIds)
})

test("reordering actors keeps their order; clearing poster does not drop video or sprite", () => {
  const next = contentEditorReferences(
    {
      ...editorMetadata(content),
      actorIds: ["actor1", "actor2"],
      thumbnailUrl: "",
    },
    content
  )
  assert.deepEqual(
    next.channelIds.filter((id) => id.startsWith("actor")),
    ["actor1", "actor2"]
  )
  assert.deepEqual(next.mediaIds, ["trailer", "v720", "v360", "sprite"])
})

test("replacing video replaces its rendition set, retaining other slots", () => {
  const next = contentEditorReferences(
    { ...editorMetadata(content), sourceUrl: "https://cdn.test/new.mp4" },
    content
  )
  assert.deepEqual(next.mediaIds, ["poster", "trailer", "sprite"])
})

test("role resolution supports new and existing channels without modifying IDs", () => {
  assert.deepEqual(
    channelPositions("person", { roles: ["actor", "director"] }),
    ["actors", "directors"]
  )
  assert.deepEqual(
    channelPositions("organization", { roles: ["studio", "label"] }),
    ["studio", "label"]
  )
  assert.deepEqual(channelPositions("actor", {}), ["actors"])
})

test("detail response batches relations and restores content ID order", async () => {
  const channels = mock.method(ChannelModel, "find", () => ({
    lean: async () => [
      {
        _id: "actor1",
        name: "First",
        handle: "one",
        kind: "person",
        metadata: { roles: ["actor"] },
      },
      {
        _id: "studio",
        name: "Studio",
        handle: "studio",
        kind: "organization",
        metadata: { roles: ["studio"] },
      },
      {
        _id: "actor2",
        name: "Second",
        handle: "two",
        kind: "person",
        metadata: { roles: ["actor"] },
      },
    ],
  }))
  const terms = mock.method(TermModel, "find", () => ({ lean: async () => [] }))
  const media = mock.method(MediaModel, "find", () => ({
    lean: async () => [
      {
        _id: "v360",
        kind: "video",
        purpose: "video",
        quality: "360",
        provider: "remote",
        metadata: { directUrl: "https://cdn.test/360.m3u8" },
      },
      {
        _id: "poster",
        kind: "image",
        purpose: "poster",
        provider: "s3",
        metadata: { directUrl: "https://cdn.test/poster.webp" },
      },
    ],
  }))
  const result = await resolveContentRelations(content)
  assert.deepEqual(
    result.channels.map((item) => item.id),
    ["studio", "actor2", "actor1"]
  )
  assert.deepEqual(result.channels[0]?.positions, ["studio"])
  assert.deepEqual(
    result.media.map((item) => [item.id, item.position, item.quality]),
    [
      ["poster", "poster", undefined],
      ["v360", "video", "360"],
    ]
  )
  for (const query of [channels, terms, media])
    assert.equal(query.mock.callCount(), 1)
})

function existingReferences() {
  for (const model of [ChannelModel, TermModel, MediaModel]) {
    mock.method(
      model,
      "countDocuments",
      async (filter: { _id: { $in: string[] } }) => filter._id.$in.length
    )
  }
  mock.method(MediaModel, "find", () => ({ lean: async () => [] }))
}

test("save persists only root IDs; registered remote IDs never cause re-downloads", async () => {
  existingReferences()
  const write = mock.method(MediaModel, "updateOne", () => {
    throw new Error("Unexpected write")
  })
  const input = {
    metadata: {
      studioId: "studio",
      actorIds: ["actor"],
      categoryIds: ["cat"],
      tagIds: ["tag"],
      posterMediaId: "poster",
      videoMediaId: ["v360", "v720"],
      thumbnailUrl: "https://cdn.test/poster.webp",
      sourceUrl: "https://cdn.test/master.m3u8",
      dvdId: "keep",
      sourceVideoId: "linked-video",
    },
  }
  await prepareContentReferences(input, "admin")
  assert.deepEqual(input, {
    channelIds: ["studio", "actor"],
    termIds: ["cat", "tag"],
    mediaIds: ["poster", "v360", "v720"],
    metadata: { dvdId: "keep", sourceVideoId: "linked-video" },
  })
  assert.equal(write.mock.callCount(), 0)
})

test("uploaded local relative URLs resolve to existing IDs, not new remote records", async () => {
  existingReferences()
  const url = "/api/v1/media/files/local/2026-09-03/test.webp"
  mock.method(MediaModel, "findOne", () => ({
    lean: async () => ({
      _id: "uploaded",
      purpose: "poster",
      metadata: { directUrl: url },
    }),
  }))
  const input = { metadata: { thumbnailUrl: url } }
  await prepareContentReferences(input, "admin")
  assert.deepEqual(input, { metadata: {}, mediaIds: ["uploaded"] })
})

test("manual remote URL creates a media record and is stripped from Content", async () => {
  existingReferences()
  mock.method(MediaModel, "findOne", () => ({ lean: async () => null }))
  const writes: Record<string, unknown>[] = []
  mock.method(
    MediaModel,
    "updateOne",
    async (
      _filter: unknown,
      update: { $setOnInsert: Record<string, unknown> }
    ) => writes.push(update.$setOnInsert)
  )
  const input = {
    metadata: { sourceUrl: "https://cdn.test/file.mp4", dvdId: "keep" },
  }
  await prepareContentReferences(input, "admin")
  assert.equal(writes.length, 1)
  assert.equal(writes[0]?.provider, "remote")
  assert.equal(writes[0]?.quality, "original")
  assert.deepEqual(writes[0]?.metadata, {
    directUrl: "https://cdn.test/file.mp4",
  })
  assert.deepEqual(input.metadata, { dvdId: "keep" })
})

test("invalid IDs and failed uploads prevent saving", async () => {
  mock.method(ChannelModel, "countDocuments", async () => 0)
  await assert.rejects(
    prepareContentReferences({ channelIds: ["missing"] }, "admin"),
    /channel IDs/
  )
  mock.restoreAll()
  existingReferences()
  mock.method(MediaModel, "find", () => ({
    lean: async () => [{ _id: "failed", error: "Upload failed" }],
  }))
  await assert.rejects(
    prepareContentReferences({ mediaIds: ["failed"] }, "admin"),
    /upload failed/
  )
})
