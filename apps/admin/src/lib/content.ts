export const contentKinds = ["video", "short", "post", "live"] as const
export type ContentKind = (typeof contentKinds)[number]

export type AdminContent = {
  _id: string
  kind: ContentKind
  status: "draft" | "processing" | "scheduled" | "published" | "ended" | "failed"
  visibility: "public" | "unlisted" | "private"
  moderationStatus: "active" | "suspended"
  title?: string
  slug?: string
  description?: string
  studioId?: string
  termIds?: string[]
  actorIds?: string[]
  metadata?: Record<string, unknown>
  relations?: ContentRelations
  seo?: {
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
  }
  publishedAt?: string
  scheduledAt?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type ContentRelations = {
  channels: Array<{ id: string; name: string; handle: string; avatarUrl: string | null; kind: "actor" | "studio" }>
  terms: Array<{ id: string; name: string; slug: string; taxonomy: "category" | "tag" }>
  contents: Array<{ id: string; title: string; slug: string; kind: "video" }>
}

export type ContentListResponse = {
  items: AdminContent[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export function isContentKind(value: string): value is ContentKind {
  return contentKinds.includes(value as ContentKind)
}
