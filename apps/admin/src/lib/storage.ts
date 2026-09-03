export const storageProviders = ["local", "s3"] as const
export type StorageProvider = (typeof storageProviders)[number]

export const storagePurposes = [
  "uploads",
  "videos",
  "images",
  "thumbnails",
  "temporary",
  "backups",
] as const
export type StoragePurpose = (typeof storagePurposes)[number]

export type AdminStorage = {
  _id: string
  name: string
  provider: StorageProvider
  enabled: boolean
  priority: number
  purposes: StoragePurpose[]
  publicUrl?: string
  local?: { basePath: string }
  s3?: {
    endpoint?: string
    region: string
    bucket: string
    prefix?: string
    forcePathStyle: boolean
    credentialsConfigured: boolean
  }
  status: "unknown" | "online" | "offline" | "error"
  health?: { checkedAt?: string; latencyMs?: number; message?: string }
  capacity?: { totalBytes?: number; usedBytes?: number; freeBytes?: number }
  createdAt: string
  updatedAt: string
}

export type StoragePayload = {
  name: string
  provider: StorageProvider
  enabled: boolean
  priority: number
  purposes: StoragePurpose[]
  publicUrl: string
  local: { basePath: string }
  s3: {
    endpoint: string
    region: string
    bucket: string
    prefix: string
    accessKeyId: string
    secretAccessKey: string
    forcePathStyle: boolean
  }
}
