import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema, model, models } = mongoose;

const accountSchema = new Schema(
    {
        _id: { type: String, required: true },
        userId: { type: String, required: true, ref: "User" },
        accountId: { type: String, required: true },
        providerId: { type: String, required: true },
        accessToken: { type: String, required: false },
        refreshToken: { type: String, required: false },
        accessTokenExpiresAt: { type: Date, required: false },
        refreshTokenExpiresAt: { type: Date, required: false },
        scope: { type: String, required: false },
        idToken: { type: String, required: false },
        password: { type: String, required: false }, // สำหรับ email/password auth
    },
    {
        timestamps: true,
        versionKey: false,
        collection: "account",
    }
);

accountSchema.index({ userId: 1 });
accountSchema.index({ providerId: 1, accountId: 1 }, { unique: true });

export type AccountSchemaType = InferSchemaType<typeof accountSchema>;
export const AccountModel: Model<AccountSchemaType> =
    (models?.Account as Model<AccountSchemaType>) ||
    model<AccountSchemaType>("Account", accountSchema);