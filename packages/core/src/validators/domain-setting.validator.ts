import { z } from "zod"

// Media settings store host[:port], while Scraping retains its HTTP(S) scheme.
function validUrl(value: string, originOnly: boolean) {
  if (!value) return true
  if (!/^https?:\/\//i.test(value)) return false
  try {
    const url = new URL(value)
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (!originOnly || url.pathname === "/")
    )
  } catch {
    return false
  }
}

function domainHost(value: string): string | null {
  if (!value) return ""
  if (/[\\\s?#@]/.test(value)) return null
  try {
    // Accept old HTTP(S) values on read/save, but store only their host.
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    )
    if (!validUrl(url.href, true)) return null
    const hostname = url.hostname
    const isIpv6 = hostname.startsWith("[") && hostname.endsWith("]")
    const isDomain =
      hostname.length <= 253 &&
      hostname.includes(".") &&
      hostname
        .split(".")
        .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    return hostname === "localhost" || isIpv6 || isDomain ? url.host : null
  } catch {
    return null
  }
}

const domain = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => domainHost(value) !== null, "invalidDomain")
  .transform((value) => domainHost(value) ?? "")
const endpoint = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => validUrl(value, false), "invalidUrl")
  .transform((value) => (value ? new URL(value).href.replace(/\/+$/, "") : ""))

export const domainSettingSchema = z
  .object({
    domain_content: domain,
    domain_static: domain,
    domain_playlist: domain,
    url_scraping: endpoint,
  })
  .strict()

export type DomainSettings = z.infer<typeof domainSettingSchema>
