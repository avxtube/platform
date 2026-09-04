export type QueueImportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"

export type AdminQueueImport = {
  _id: string
  status: QueueImportStatus
  url: string
  dvdId: string
  ref: string
  workerId?: string
  startedAt?: string
  failedAt?: string
  completedAt?: string
  error?: string
  createdAt: string
  updatedAt: string
}

export type QueueImportListResponse = {
  items: AdminQueueImport[]
  total: number
  page: number
  limit: number
  totalPages: number
}
