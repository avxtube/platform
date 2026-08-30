import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema, model, models } = mongoose;

import { v4 as uuidv4 } from "uuid";

const settingSchema = new Schema(
    {
        _id: { type: String, default: uuidv4 },
        name: { type: String, required: true, unique: true },
        value: { type: Schema.Types.Mixed },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: "settings",
    }
);

export type SettingSchemaType = InferSchemaType<typeof settingSchema>;
export const SettingModel: Model<SettingSchemaType> =
    (models?.Setting as Model<SettingSchemaType>)
    || model<SettingSchemaType>("Setting", settingSchema);

