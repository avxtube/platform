import type { MetadataField, MetadataGroup, MetadataLabel, MetadataScope } from "./types"

const registry = new Map<MetadataScope, readonly MetadataGroup[]>()
const listeners = new Set<() => void>()

export function defineMetadataGroups<const Groups extends readonly MetadataGroup[]>(groups: Groups) {
  return groups
}

export function registerMetadata(scope: MetadataScope, groups: readonly MetadataGroup[]) {
  const groupIds = new Set(groups.map((group) => group.id))
  const existing = registry.get(scope) ?? []
  registry.set(scope, [...existing.filter((group) => !groupIds.has(group.id)), ...groups])
  emitChange()

  return () => {
    const registered = registry.get(scope) ?? []
    const next = registered.filter((group) => !groups.includes(group))
    if (next.length) registry.set(scope, next)
    else registry.delete(scope)
    emitChange()
  }
}

export function getMetadata(scope: MetadataScope) {
  return registry.get(scope) ?? []
}

export function subscribeMetadata(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getMetadataFieldIds(scope: MetadataScope) {
  return new Set(getMetadata(scope).flatMap((group) => group.fields.map((field) => field.id)))
}

export function splitMetadata(scope: MetadataScope, metadata: Record<string, unknown>) {
  const registeredIds = getMetadataFieldIds(scope)
  const registered: Record<string, unknown> = {}
  const custom: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    if (registeredIds.has(key)) registered[key] = value
    else custom[key] = value
  }

  return { registered, custom }
}

export function validateMetadata(scope: MetadataScope, metadata: Record<string, unknown>) {
  for (const group of getMetadata(scope)) {
    for (const field of group.fields) {
      if (!field.required || !isMetadataFieldVisible(field, metadata)) continue
      const value = metadata[field.id]
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return field
    }
  }
  return null
}

export function isMetadataFieldVisible(field: MetadataField, metadata: Record<string, unknown>) {
  return !field.visibleWhen || metadata[field.visibleWhen.field] === field.visibleWhen.equals
}

export function getMetadataLabel(label: MetadataLabel, locale: string) {
  return locale === "th" ? label.th : label.en
}

export function normalizeMetadataValue(field: MetadataField, value: unknown) {
  if (field.type === "switch") return Boolean(value)
  if (field.type === "number") {
    if (value === "" || value === undefined || value === null) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (field.type === "media-multiple" || field.type === "relation-multiple") {
    const items = Array.isArray(value) ? value : String(value ?? "").split(/[\n,]/)
    const normalized = [...new Set(items.map((item) => String(item).trim()).filter(Boolean))]
    return normalized.length ? normalized : undefined
  }
  if (field.type === "datetime") {
    const text = String(value ?? "").trim()
    if (!text) return undefined
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  }
  const text = String(value ?? "").trim()
  return text || undefined
}

function emitChange() {
  listeners.forEach((listener) => listener())
}
