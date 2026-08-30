import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema, model, models } = mongoose;

const actorProfileSchema = new Schema(
  {
    _id: { type: String, required: true },
    channelId: { type: String, ref: "Channel", required: true, unique: true },
    stageName: { type: String, required: true, trim: true, maxlength: 100 },
    nationality: { type: String, default: null },
    genres: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false, collection: "actor_profiles" },
);

const studioProfileSchema = new Schema(
  {
    _id: { type: String, required: true },
    channelId: { type: String, ref: "Channel", required: true, unique: true },
    legalName: { type: String, default: null, maxlength: 200 },
    foundedYear: { type: Number, default: null, min: 1800 },
    specialties: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false, collection: "studio_profiles" },
);

export type ActorProfileSchemaType = InferSchemaType<typeof actorProfileSchema>;
export type StudioProfileSchemaType = InferSchemaType<typeof studioProfileSchema>;

export const ActorProfileModel: Model<ActorProfileSchemaType> =
  (models?.ActorProfile as Model<ActorProfileSchemaType>) ||
  model<ActorProfileSchemaType>("ActorProfile", actorProfileSchema);

export const StudioProfileModel: Model<StudioProfileSchemaType> =
  (models?.StudioProfile as Model<StudioProfileSchemaType>) ||
  model<StudioProfileSchemaType>("StudioProfile", studioProfileSchema);
