import {
  CHANNEL_KINDS,
  CHANNEL_ROLES,
  CHANNEL_TAB_IDS,
  CHANNEL_GENDERS,
  type Actor,
  type Channel,
  type ChannelTabId,
} from "@workspace/core/types/channel"
import { ChannelModel, ContentModel } from "@workspace/db/models"
import type { PipelineStage } from "mongoose"
import {
  dateValue,
  isRecord,
  numberValue,
  plainText,
  publicVideoFilter,
  stringArray,
  stringValue,
  toRecord,
} from "./content-video.service"

export function publicChannelFilter(): Record<string, unknown> {
  return { status: "active", deletedAt: null }
}

export function channelPagePipeline(
  filter: Record<string, unknown>,
  limit = 30,
  offset = 0
): PipelineStage[] {
  return [
    { $match: filter },
    { $sort: { createdAt: -1, _id: -1 } },
    { $skip: offset },
    { $limit: limit },
    {
      $lookup: {
        from: ContentModel.collection.name,
        localField: "_id",
        foreignField: "channelIds",
        pipeline: [
          {
            $match: {
              ...publicVideoFilter(),
              kind: { $in: ["video", "short", "post"] },
            },
          },
          {
            $group: {
              _id: "$kind",
              count: { $sum: 1 },
              views: { $sum: "$stats.viewCount" },
            },
          },
        ],
        as: "contentStats",
      },
    },
    {
      $project: {
        name: 1,
        handle: 1,
        kind: 1,
        layout: 1,
        enabledTabs: 1,
        defaultTab: 1,
        membershipEnabled: 1,
        description: 1,
        avatarUrl: 1,
        bannerUrl: 1,
        country: 1,
        verifiedAt: 1,
        createdAt: 1,
        links: 1,
        "stats.subscriberCount": 1,
        contentStats: 1,
        "metadata.roles": 1,
        "metadata.gender": 1,
        "metadata.genres": 1,
        "metadata.specialties": 1,
        "metadata.topics": 1,
      },
    },
  ]
}
export function getPublicChannels(
  filter: Record<string, unknown> = publicChannelFilter(),
  limit = 30,
  offset = 0
) {
  return ChannelModel.aggregate<Record<string, unknown>>(
    channelPagePipeline(filter, limit, offset)
  ).exec()
}

export function mapChannel(row: Record<string, unknown>): Channel {
  const metadata = toRecord(row.metadata)
  const contentStats = Array.isArray(row.contentStats)
    ? row.contentStats.filter(isRecord)
    : []
  const tabIds = stringArray(row.enabledTabs)
  const enabledTabs = CHANNEL_TAB_IDS.filter((tab) => tabIds.includes(tab))
  const tabs: ChannelTabId[] = enabledTabs.length
    ? enabledTabs
    : ["home", "videos", "shorts", "posts", "about"]
  const links = Array.isArray(row.links)
    ? row.links
        .filter(isRecord)
        .map((link) => ({
          label: stringValue(link.label),
          url: stringValue(link.url),
        }))
        .filter((link) => /^https?:\/\//.test(link.url))
    : []
  return {
    id: stringValue(row._id),
    name: stringValue(row.name),
    handle: stringValue(row.handle).replace(/^@/, ""),
    kind: CHANNEL_KINDS.find((kind) => kind === row.kind) ?? "page",
    layout: row.layout === "compact" ? "compact" : "banner",
    enabledTabs: tabs,
    defaultTab: tabs.find((tab) => tab === row.defaultTab) ?? tabs[0] ?? "home",
    membershipEnabled: row.membershipEnabled === true,
    description: plainText(stringValue(row.description)),
    avatarUrl: stringValue(row.avatarUrl) || null,
    bannerUrl: stringValue(row.bannerUrl) || null,
    country: stringValue(row.country) || null,
    verified: Boolean(row.verifiedAt),
    subscriberCount: numberValue(toRecord(row.stats).subscriberCount),
    videoCount: numberValue(
      contentStats.find((item) => item._id === "video")?.count
    ),
    shortCount: numberValue(
      contentStats.find((item) => item._id === "short")?.count
    ),
    viewCount: contentStats.reduce(
      (sum, item) => sum + numberValue(item.views),
      0
    ),
    joinedAt: dateValue(row.createdAt),
    isFollowing: false,
    links,
    metadata: {
      roles: CHANNEL_ROLES.filter((role) =>
        stringArray(metadata.roles).includes(role)
      ),
      gender: CHANNEL_GENDERS.find((gender) => gender === metadata.gender),
      genres: stringArray(metadata.genres),
      specialties: stringArray(metadata.specialties),
      topics: stringArray(metadata.topics),
    },
  }
}

export function mapActor(row: Record<string, unknown>): Actor {
  const channel = mapChannel(row)
  return {
    id: channel.id,
    name: channel.name,
    handle: `@${channel.handle}`,
    kind: channel.kind,
    gender: channel.metadata?.gender,
    avatarUrl: channel.avatarUrl,
    verified: channel.verified,
    bio: channel.description,
    followerCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    coverUrl: channel.bannerUrl || channel.avatarUrl || "",
    isFollowing: false,
  }
}
