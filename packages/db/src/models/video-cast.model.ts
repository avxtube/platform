import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema, model, models } = mongoose;

const videoCastSchema = new Schema(
  {
    _id: { type: String, required: true },
    videoId: { type: String, ref: "Video", required: true },
    actorChannelId: { type: String, ref: "Channel", required: true },
    role: { type: String, default: null, maxlength: 100 },
    billingOrder: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false, collection: "video_cast" },
);

videoCastSchema.index({ videoId: 1, actorChannelId: 1 }, { unique: true });
videoCastSchema.index({ actorChannelId: 1, createdAt: -1 });

export type VideoCastSchemaType = InferSchemaType<typeof videoCastSchema>;

export const VideoCastModel: Model<VideoCastSchemaType> =
  (models?.VideoCast as Model<VideoCastSchemaType>) ||
  model<VideoCastSchemaType>("VideoCast", videoCastSchema);
