export const termTaxonomies = ["category", "tag", "label", "series"] as const
export type TermTaxonomy = (typeof termTaxonomies)[number]
export type EntityStatus = "active" | "deleted"

export type AdminTerm = {
  _id: string
  taxonomy: TermTaxonomy
  name: string
  slug: string
  description?: string
  status: EntityStatus
  createdAt: string
  updatedAt: string
}

export type EntityListResponse<T> = {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const channelKinds = ["person", "organization", "page"] as const
export type AdminChannelKind = (typeof channelKinds)[number]
export const channelStatuses = ["active", "suspended", "deleted"] as const
export type AdminChannelStatus = (typeof channelStatuses)[number]
export const channelRoles = [
  "actor",
  "director",
  "creator",
  "studio",
  "label",
  "brand",
  "community",
] as const
export type AdminChannelRole = (typeof channelRoles)[number]
export const channelGenders = ["male", "female", "non_binary", "other"] as const
export type AdminChannelGender = (typeof channelGenders)[number]

export type AdminChannel = {
  _id: string
  kind: AdminChannelKind
  layout: "banner" | "compact"
  handle: string
  name: string
  description: string
  avatarUrl: string | null
  bannerUrl: string | null
  status: AdminChannelStatus
  roles: AdminChannelRole[]
  gender: AdminChannelGender | null
  stats: {
    subscriberCount?: number
    videoCount?: number
    shortCount?: number
    viewCount?: number
  }
  createdAt: string
  updatedAt: string
}

export type TermPayload = {
  taxonomy: TermTaxonomy
  name: string
  slug?: string
  description?: string
  status: EntityStatus
}

export type ChannelPayload = {
  kind: AdminChannelKind
  layout: "banner" | "compact"
  name: string
  handle: string
  description: string
  avatarUrl: string
  bannerUrl: string
  status: AdminChannelStatus
  roles: AdminChannelRole[]
  gender?: AdminChannelGender
}
