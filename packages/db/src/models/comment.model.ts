import mongoose, { type InferSchemaType, type Model } from "mongoose"
import { v4 as uuidv4 } from "uuid"

const { Schema, model, models } = mongoose

const commentSchema = new Schema(
  {
    _id: { type: String, required: true, default: uuidv4 },
    contentId: { type: String, ref: "Content", required: true },
    userId: { type: String, ref: "User", required: true },
    parentId: { type: String, ref: "Comment" },
    message: { type: String, required: true, trim: true, maxlength: 2_000 },
    likeCount: { type: Number, default: 0, min: 0 },
    pinned: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false, collection: "comments" }
)

commentSchema.index({ contentId: 1, parentId: 1, createdAt: -1, _id: -1 })
commentSchema.index({ userId: 1, createdAt: -1 })

export type CommentSchemaType = InferSchemaType<typeof commentSchema>

export const CommentModel: Model<CommentSchemaType> =
  (models?.Comment as Model<CommentSchemaType>) ||
  model<CommentSchemaType>("Comment", commentSchema)
