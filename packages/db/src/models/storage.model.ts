import mongoose, { type InferSchemaType, type Model } from "mongoose"
import { v4 as uuidv4 } from "uuid"

import {
  StorageProvider,
  StoragePurpose,
  StorageStatus,
} from "@workspace/core/enums"

const { Schema, model, models } = mongoose

const localStorageConfigSchema = new Schema(
  {
    basePath: { type: String, required: true, trim: true, maxlength: 1_000 },
  },
  { _id: false }
)

const s3StorageConfigSchema = new Schema(
  {
    endpoint: { type: String, trim: true, maxlength: 1_000 },
    region: { type: String, required: true, trim: true, maxlength: 100 },
    bucket: { type: String, required: true, trim: true, maxlength: 255 },
    prefix: { type: String, trim: true, maxlength: 1_000 },
    forcePathStyle: { type: Boolean, default: false },
    credentialsConfigured: { type: Boolean, default: false },
    accessKeyIdEncrypted: { type: String, select: false },
    secretAccessKeyEncrypted: { type: String, select: false },
  },
  { _id: false }
)

const storageHealthSchema = new Schema(
  {
    checkedAt: { type: Date },
    latencyMs: { type: Number, min: 0 },
    message: { type: String, maxlength: 500 },
  },
  { _id: false }
)

const storageCapacitySchema = new Schema(
  {
    totalBytes: { type: Number, min: 0 },
    usedBytes: { type: Number, min: 0 },
    freeBytes: { type: Number, min: 0 },
  },
  { _id: false }
)

const storageSchema = new Schema(
  {
    _id: { type: String, required: true, default: uuidv4 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    provider: {
      type: String,
      required: true,
      enum: Object.values(StorageProvider),
    },
    enabled: { type: Boolean, required: true, default: false },
    priority: {
      type: Number,
      required: true,
      default: 100,
      min: 0,
      max: 1_000,
    },
    purposes: {
      type: [String],
      enum: Object.values(StoragePurpose),
      required: true,
    },
    publicUrl: { type: String, trim: true, maxlength: 1_000 },
    local: { type: localStorageConfigSchema },
    s3: { type: s3StorageConfigSchema },
    status: {
      type: String,
      required: true,
      enum: Object.values(StorageStatus),
      default: StorageStatus.UNKNOWN,
    },
    health: { type: storageHealthSchema },
    capacity: { type: storageCapacitySchema },
    createdBy: { type: String, ref: "User", required: true },
    updatedBy: { type: String, ref: "User", required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false, collection: "storages" }
)

storageSchema.index(
  { name: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: { $type: "null" } },
  }
)
storageSchema.index({ provider: 1, enabled: 1, priority: 1 })
storageSchema.index({ status: 1, updatedAt: -1 })

export type StorageSchemaType = InferSchemaType<typeof storageSchema>
export const StorageModel: Model<StorageSchemaType> =
  (models?.Storage as Model<StorageSchemaType>) ||
  model<StorageSchemaType>("Storage", storageSchema)
