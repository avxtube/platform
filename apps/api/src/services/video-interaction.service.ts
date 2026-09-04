import type { VideoInteraction } from "@workspace/core/types"
import { randomUUID } from "node:crypto"
import {
  ContentModel,
  UserContentActivityModel,
} from "@workspace/db/models"

type Reaction = VideoInteraction["reaction"]

export async function getVideoInteraction(
  userId: string,
  contentId: string
): Promise<VideoInteraction> {
  const [activity, content] = await Promise.all([
    UserContentActivityModel.findOne({ userId, contentId }).lean(),
    ContentModel.findById(contentId).select({ stats: 1 }).lean(),
  ])
  return {
    reaction:
      activity?.reaction === "like" || activity?.reaction === "dislike"
        ? activity.reaction
        : null,
    watchLater: activity?.watchLater === true,
    saved: activity?.saved === true,
    likeCount: Math.max(0, Number(content?.stats?.likeCount) || 0),
    dislikeCount: Math.max(0, Number(content?.stats?.dislikeCount) || 0),
  }
}

export async function setVideoReaction(
  userId: string,
  contentId: string,
  reaction: Reaction
) {
  const current = await UserContentActivityModel.findOne({
    userId,
    contentId,
  }).lean()
  const previous: Reaction =
    current?.reaction === "like" || current?.reaction === "dislike"
      ? current.reaction
      : null
  if (previous === reaction) return getVideoInteraction(userId, contentId)

  await UserContentActivityModel.updateOne(
    { userId, contentId },
    reaction
      ? {
          $set: { reaction },
          $setOnInsert: { _id: randomUUID(), userId, contentId },
        }
      : {
          $unset: { reaction: 1 },
          $setOnInsert: { _id: randomUUID(), userId, contentId },
        },
    { upsert: true }
  )

  const likeDelta =
    (reaction === "like" ? 1 : 0) - (previous === "like" ? 1 : 0)
  const dislikeDelta =
    (reaction === "dislike" ? 1 : 0) - (previous === "dislike" ? 1 : 0)
  await ContentModel.updateOne(
    { _id: contentId },
    {
      $inc: {
        "stats.likeCount": likeDelta,
        "stats.dislikeCount": dislikeDelta,
      },
    }
  )
  return getVideoInteraction(userId, contentId)
}

export async function setVideoCollectionFlag(
  userId: string,
  contentId: string,
  field: "watchLater" | "saved",
  enabled: boolean
) {
  await UserContentActivityModel.updateOne(
    { userId, contentId },
    {
      $set: { [field]: enabled },
      $setOnInsert: { _id: randomUUID(), userId, contentId },
    },
    { upsert: true }
  )
  return getVideoInteraction(userId, contentId)
}

export async function markVideoWatched(userId: string, contentId: string) {
  await UserContentActivityModel.updateOne(
    { userId, contentId },
    {
      $set: { watchedAt: new Date() },
      $setOnInsert: { _id: randomUUID(), userId, contentId },
    },
    { upsert: true }
  )
}
