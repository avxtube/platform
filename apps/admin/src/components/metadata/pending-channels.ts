export type PendingChannel = {
  key: string
  kind: "actor" | "studio"
  name: string
}

const pendingPrefix = "__pending_channel__:"

export function createPendingChannelValue(kind: PendingChannel["kind"], name: string) {
  return `${pendingPrefix}${kind}:${encodeURIComponent(name.trim().replace(/\s+/g, " "))}`
}

export function parsePendingChannelValue(value: string): PendingChannel | null {
  if (!value.startsWith(pendingPrefix)) return null
  const remainder = value.slice(pendingPrefix.length)
  const separator = remainder.indexOf(":")
  if (separator < 0) return null
  const kind = remainder.slice(0, separator)
  if (kind !== "actor" && kind !== "studio") return null

  try {
    const name = decodeURIComponent(remainder.slice(separator + 1)).trim()
    return name ? { key: value, kind, name } : null
  } catch {
    return null
  }
}

export function collectPendingChannels(value: unknown) {
  const found = new Map<string, PendingChannel>()
  visitStrings(value, (item) => {
    const pending = parsePendingChannelValue(item)
    if (pending) found.set(pending.key, pending)
  })
  return [...found.values()]
}

export function replacePendingChannels(value: unknown, resolved: Map<string, string>): unknown {
  if (typeof value === "string") return resolved.get(value) ?? value
  if (Array.isArray(value)) return value.map((item) => replacePendingChannels(item, resolved))
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replacePendingChannels(item, resolved)])
  )
}

function visitStrings(value: unknown, visit: (value: string) => void) {
  if (typeof value === "string") {
    visit(value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => visitStrings(item, visit))
    return
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => visitStrings(item, visit))
  }
}
