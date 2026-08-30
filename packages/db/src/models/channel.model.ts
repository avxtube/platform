import mongoose, { type InferSchemaType, type Model } from "mongoose";

import { CHANNEL_KINDS } from "@workspace/core/types";

const { Schema, model, models } = mongoose;

const channelStatsSchema = new Schema(
  {
    subscriberCount: { type: Number, default: 0, min: 0 },
    videoCount: { type: Number, default: 0, min: 0 },
    shortCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const channelLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 50 },
    url: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const channelSchema = new Schema(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, ref: "User", required: true },
    kind: { type: String, enum: CHANNEL_KINDS, required: true, default: "creator" },
    layout: { type: String, enum: ["banner", "compact"], default: "banner" },
    enabledTabs: {
      type: [String],
      enum: ["home", "videos", "shorts", "live", "courses", "playlists", "posts", "about"],
      default: ["home", "videos", "shorts", "playlists", "posts", "about"],
    },
    defaultTab: {
      type: String,
      enum: ["home", "videos", "shorts", "live", "courses", "playlists", "posts", "about"],
      default: "home",
    },
    membershipEnabled: { type: Boolean, default: false },
    handle: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9]+$/ },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 5_000 },
    avatarUrl: { type: String, default: null },
    bannerUrl: { type: String, default: null },
    country: { type: String, default: null },
    keywords: { type: [String], default: [] },
    links: { type: [channelLinkSchema], default: [] },
    status: { type: String, enum: ["active", "suspended", "deleted"], default: "active" },
    verifiedAt: { type: Date, default: null },
    stats: { type: channelStatsSchema, default: () => ({}) },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: "channels" },
);

channelSchema.index({ handle: 1 }, { unique: true });
channelSchema.index({ kind: 1, status: 1, createdAt: -1 });
channelSchema.index({ ownerId: 1, status: 1 });
channelSchema.index({ name: "text", handle: "text", keywords: "text" });

export type ChannelSchemaType = InferSchemaType<typeof channelSchema>;

export const ChannelModel: Model<ChannelSchemaType> =
  (models?.Channel as Model<ChannelSchemaType>) || model<ChannelSchemaType>("Channel", channelSchema);

const channelMemberSchema = new Schema(
  {
    _id: { type: String, required: true },
    channelId: { type: String, ref: "Channel", required: true },
    userId: { type: String, ref: "User", required: true },
    role: { type: String, enum: ["owner", "manager", "editor", "viewer"], default: "viewer" },
    invitedBy: { type: String, ref: "User", default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: "channel_members" },
);

channelMemberSchema.index({ channelId: 1, userId: 1 }, { unique: true });
channelMemberSchema.index({ userId: 1, createdAt: -1 });

export type ChannelMemberSchemaType = InferSchemaType<typeof channelMemberSchema>;

export const ChannelMemberModel: Model<ChannelMemberSchemaType> =
  (models?.ChannelMember as Model<ChannelMemberSchemaType>) ||
  model<ChannelMemberSchemaType>("ChannelMember", channelMemberSchema);
