import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const { Schema, model, models } = mongoose;

export const CONTENT_KINDS = ["video", "short", "post", "live"] as const;
export const CONTENT_STATUSES = [
    "draft",
    "processing",
    "scheduled",
    "published",
    "ended",
    "failed",
] as const;
export const CONTENT_VISIBILITIES = ["public", "unlisted", "private"] as const;
export const CONTENT_MODERATION_STATUSES = ["active", "suspended"] as const;

const contentStatsSchema = new Schema(
    {
        viewCount: { type: Number, default: 0, min: 0 },
        likeCount: { type: Number, default: 0, min: 0 },
        dislikeCount: { type: Number, default: 0, min: 0 },
        commentCount: { type: Number, default: 0, min: 0 },
        shareCount: { type: Number, default: 0, min: 0 },
    },
    { _id: false },
);

const contentSeoSchema = new Schema(
    {
        metaTitle: { type: String, trim: true, maxlength: 300 },
        metaDescription: { type: String, trim: true, maxlength: 160 },
        keywords: {
            type: [{ type: String, trim: true, maxlength: 300 }],
            default: undefined,
        },
    },
    { _id: false },
);

const contentSchema = new Schema(
    {
        _id: { type: String, required: true, default: uuidv4 },
        studioId: { type: String, ref: "Channel" },
        kind: { type: String, required: true, enum: CONTENT_KINDS, default: "video" },
        status: { type: String, required: true, enum: CONTENT_STATUSES, default: "draft" },
        visibility: {
            type: String,
            required: true,
            enum: CONTENT_VISIBILITIES,
            default: "private",
        },
        moderationStatus: {
            type: String,
            required: true,
            enum: CONTENT_MODERATION_STATUSES,
            default: "active",
        },
        title: { type: String, trim: true, maxlength: 1_000 },
        slug: { type: String, trim: true, lowercase: true, maxlength: 300 },
        description: { type: String, maxlength: 20_000 },
        termIds: {
            type: [{ type: String, ref: "Term" }],
            default: undefined,
        },
        actorIds: {
            type: [{ type: String, ref: "Channel" }],
            default: undefined,
        },
        stats: { type: contentStatsSchema, default: () => ({}) },
        seo: { type: contentSeoSchema },
        metadata: { type: Map, of: Schema.Types.Mixed },
        publishedAt: { type: Date },
        scheduledAt: { type: Date },
        deletedAt: { type: Date },
        createdBy: { type: String, ref: "User", required: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: "contents",
    },
);

contentSchema.index({ studioId: 1, kind: 1, status: 1, publishedAt: -1 });
contentSchema.index({ visibility: 1, status: 1, publishedAt: -1 });
contentSchema.index({ kind: 1, moderationStatus: 1, publishedAt: -1 });
contentSchema.index({ actorIds: 1, status: 1, publishedAt: -1 });
contentSchema.index({ "metadata.sourceVideoId": 1, kind: 1 });
contentSchema.index({ kind: 1, slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: "string" } } });

export type ContentSchemaType = InferSchemaType<typeof contentSchema>;

export const ContentModel: Model<ContentSchemaType> =
    (models?.Content as Model<ContentSchemaType>) ||
    model<ContentSchemaType>("Content", contentSchema);
