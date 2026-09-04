import assert from "node:assert/strict"
import { test } from "node:test"
import { mapFollowingProfile } from "../src/services/following.service"

test("maps followed people from channel data", () => {
  assert.deepEqual(
    mapFollowingProfile({
      channel: {
        _id: "actor-id",
        kind: "person",
        name: "Jane Doe",
        handle: "@jane",
        avatarUrl: "https://static.test/jane.jpg",
        verifiedAt: new Date("2026-01-01"),
        metadata: { roles: ["actor"] },
      },
      liveContent: [{ _id: "live" }],
    }),
    {
      id: "actor-id",
      type: "actor",
      name: "Jane Doe",
      handle: "jane",
      initials: "JD",
      avatarUrl: "https://static.test/jane.jpg",
      verified: true,
      isLive: true,
      hasNew: false,
    }
  )
})

test("maps followed organizations as studios", () => {
  const profile = mapFollowingProfile({
    channel: {
      _id: "studio-id",
      kind: "organization",
      name: "Example Studio",
      handle: "example",
      metadata: { roles: ["studio"] },
    },
    liveContent: [],
  })
  assert.equal(profile.type, "studio")
  assert.equal(profile.initials, "ES")
  assert.equal(profile.avatarUrl, null)
  assert.equal(profile.isLive, false)
})
