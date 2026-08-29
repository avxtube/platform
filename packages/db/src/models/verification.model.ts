import { InferSchemaType, model, models, Schema, type Model } from "mongoose";

const verificationSchema = new Schema(
    {
        _id: { type: String, required: true },
        identifier: { type: String, required: true },
        value: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: "verification",
    }
);

verificationSchema.index({ identifier: 1 });
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type VerificationSchemaType = InferSchemaType<typeof verificationSchema>;

export const VerificationModel: Model<VerificationSchemaType> =
    (models?.Verification as Model<VerificationSchemaType>) ||
    model<VerificationSchemaType>("Verification", verificationSchema);