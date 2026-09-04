import mongoose, { type InferSchemaType, type Model } from "mongoose"
import { v4 as uuidv4 } from "uuid"

const { Schema, model, models } = mongoose

const userContentActivitySchema = new Schema(
  {
    _id: { type: String, required: true, default: uuidv4 },
    userId: { type: String, ref: "User", required: true },
    contentId: { type: String, ref: "Content", required: true },
    reaction: { type: String, enum: ["like", "dislike"] },
    watchLater: { type: Boolean, default: false },
    saved: { type: Boolean, default: false },
    watchedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "user_content_activities",
  }
)

userContentActivitySchema.index({ userId: 1, contentId: 1 }, { unique: true })
userContentActivitySchema.index({ userId: 1, watchedAt: -1 })
userContentActivitySchema.index({ userId: 1, reaction: 1, updatedAt: -1 })
userContentActivitySchema.index({ userId: 1, watchLater: 1, updatedAt: -1 })
userContentActivitySchema.index({ userId: 1, saved: 1, updatedAt: -1 })

export type UserContentActivitySchemaType = InferSchemaType<
  typeof userContentActivitySchema
>

export const UserContentActivityModel: Model<UserContentActivitySchemaType> =
  (models?.UserContentActivity as Model<UserContentActivitySchemaType>) ||
  model<UserContentActivitySchemaType>(
    "UserContentActivity",
    userContentActivitySchema
  )
