import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema, model, models } = mongoose;

const subscriptionSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, ref: "User", required: true },
    channelId: { type: String, ref: "Channel", required: true },
    notifications: { type: String, enum: ["all", "personalized", "none"], default: "personalized" },
  },
  { timestamps: true, versionKey: false, collection: "subscriptions" },
);

subscriptionSchema.index({ userId: 1, channelId: 1 }, { unique: true });
subscriptionSchema.index({ channelId: 1, createdAt: -1 });

export type SubscriptionSchemaType = InferSchemaType<typeof subscriptionSchema>;

export const SubscriptionModel: Model<SubscriptionSchemaType> =
  (models?.Subscription as Model<SubscriptionSchemaType>) ||
  model<SubscriptionSchemaType>("Subscription", subscriptionSchema);
