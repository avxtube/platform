import { UserRole } from "@workspace/core/enums";
import mongoose, { type InferSchemaType, type Model } from "mongoose";
const { Schema, model, models } = mongoose;

const userSchema = new Schema(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, index: true },
        username: {
            type: String,
            required: false,
            unique: true,
            lowercase: true,
            minlength: 3,
            maxlength: 30,
            match: /^[a-z0-9]+$/,
        },
        emailVerified: { type: Boolean, default: false },
        twoFactorEnabled: { type: Boolean, default: false },
        role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
        image: { type: String, default: null },
        country: { type: String },
    },
    { timestamps: true, versionKey: false, collection: "user" }
);

userSchema.index({ role: 1 });

export type UserSchemaType = InferSchemaType<typeof userSchema>;

export const UserModel: Model<UserSchemaType> =
    (models?.User as Model<UserSchemaType>) ||
    model<UserSchemaType>("User", userSchema);
