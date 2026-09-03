import mongoose, { type InferSchemaType, type Model } from "mongoose"
import { v4 as uuidv4 } from "uuid"

const { Schema, model, models } = mongoose

export const MEDIA_KINDS = ["image", "video"] as const
export const MEDIA_PROVIDERS = ["local", "s3", "vdohide"] as const
export const MEDIA_STATUSES = ["processing", "ready", "failed"] as const
export const MEDIA_PURPOSES = [
  "poster",
  "short-poster",
  "thumbnail",
  "avatar",
  "trailer",
  "video",
  "short",
  "live",
] as const

const mediaSchema = new Schema(
  {
    _id: { type: String, required: true, default: uuidv4 },
    contentId: { type: String, ref: "Content" },
    kind: { type: String, required: true, enum: MEDIA_KINDS },
    purpose: { type: String, required: true, enum: MEDIA_PURPOSES },
    provider: { type: String, required: true, enum: MEDIA_PROVIDERS },
    status: {
      type: String,
      required: true,
      enum: MEDIA_STATUSES,
      default: "processing",
    },
    storageId: { type: String, ref: "Storage" },
    externalId: { type: String, trim: true, maxlength: 500 },
    externalSlug: { type: String, trim: true, maxlength: 500 },
    sourceUrl: { type: String, trim: true, maxlength: 4_000 },
    url: { type: String, trim: true, maxlength: 4_000 },
    key: { type: String, trim: true, maxlength: 2_000 },
    originalName: { type: String, trim: true, maxlength: 1_000 },
    mimeType: { type: String, trim: true, maxlength: 255 },
    size: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    durationSeconds: { type: Number, min: 0 },
    error: { type: String, maxlength: 2_000 },
    metadata: { type: Map, of: Schema.Types.Mixed },
    createdBy: { type: String, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: "medias" }
)

mediaSchema.index({ contentId: 1, purpose: 1, createdAt: -1 })
mediaSchema.index({ status: 1, provider: 1, createdAt: -1 })
mediaSchema.index({ storageId: 1, key: 1 })
mediaSchema.index({ externalId: 1, provider: 1 })
mediaSchema.index({ createdBy: 1, createdAt: -1 })
mediaSchema.index({ deletedAt: 1, createdAt: -1 })

export type MediaSchemaType = InferSchemaType<typeof mediaSchema>
export const MediaModel: Model<MediaSchemaType> =
  (models?.Media as Model<MediaSchemaType>) ||
  model<MediaSchemaType>("Media", mediaSchema)
