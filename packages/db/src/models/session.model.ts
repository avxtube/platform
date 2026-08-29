import { InferSchemaType, model, models, Schema, type Model } from "mongoose";

// Session Schema - ตาม better-auth core schema
const sessionSchema = new Schema(
    {
        _id: { type: String, required: true },
        userId: { type: String, required: true, ref: "User" },
        token: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
        ipAddress: { type: String, required: false },
        userAgent: { type: String, required: false },
        country: { type: String },
        provider: { type: String },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: "session",
    }
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionSchemaType = InferSchemaType<typeof sessionSchema>;

export const SessionModel: Model<SessionSchemaType> =
    (models?.Session as Model<SessionSchemaType>) ||
    model<SessionSchemaType>("Session", sessionSchema);