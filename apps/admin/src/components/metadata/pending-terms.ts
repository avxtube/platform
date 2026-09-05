export type PendingTerm = {
  key: string
  taxonomy: "category" | "tag" | "label" | "series"
  name: string
}

const pendingPrefix = "__pending_term__:"

export function createPendingTermValue(
  taxonomy: PendingTerm["taxonomy"],
  name: string
) {
  return `${pendingPrefix}${taxonomy}:${encodeURIComponent(name.trim().replace(/\s+/g, " "))}`
}

export function parsePendingTermValue(value: string): PendingTerm | null {
  if (!value.startsWith(pendingPrefix)) return null
  const remainder = value.slice(pendingPrefix.length)
  const separator = remainder.indexOf(":")
  if (separator < 0) return null
  const taxonomy = remainder.slice(0, separator)
  if (!["category", "tag", "label", "series"].includes(taxonomy)) return null
  try {
    const name = decodeURIComponent(remainder.slice(separator + 1)).trim()
    return name
      ? {
          key: value,
          taxonomy: taxonomy as PendingTerm["taxonomy"],
          name,
        }
      : null
  } catch {
    return null
  }
}

export function collectPendingTerms(value: unknown) {
  const found = new Map<string, PendingTerm>()
  visitStrings(value, (item) => {
    const pending = parsePendingTermValue(item)
    if (pending) found.set(pending.key, pending)
  })
  return [...found.values()]
}

export function replacePendingTerms(
  value: unknown,
  resolved: Map<string, string>
): unknown {
  if (typeof value === "string") return resolved.get(value) ?? value
  if (Array.isArray(value))
    return value.map((item) => replacePendingTerms(item, resolved))
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      replacePendingTerms(item, resolved),
    ])
  )
}

function visitStrings(value: unknown, visit: (value: string) => void) {
  if (typeof value === "string") return visit(value)
  if (Array.isArray(value))
    return value.forEach((item) => visitStrings(item, visit))
  if (value && typeof value === "object")
    Object.values(value).forEach((item) => visitStrings(item, visit))
}
