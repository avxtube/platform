export type MetadataScope = string

export type MetadataLabel = {
  en: string
  th: string
}

export type MetadataOption = {
  label: MetadataLabel
  value: string
}

export type MetadataField = {
  id: string
  type:
    | "text"
    | "textarea"
    | "number"
    | "url"
    | "date"
    | "datetime"
    | "select"
    | "switch"
    | "media"
    | "media-multiple"
    | "relation"
    | "relation-multiple"
  label: MetadataLabel
  description?: MetadataLabel
  required?: boolean
  placeholder?: MetadataLabel
  visibleWhen?: {
    field: string
    equals: unknown
  }
  min?: number
  max?: number
  step?: number
  options?: MetadataOption[]
  relation?: string
  truncateLabelAt?: number
}

export type MetadataGroup = {
  id: string
  label: MetadataLabel
  description?: MetadataLabel
  fields: MetadataField[]
}
