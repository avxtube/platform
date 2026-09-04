import { domainSettingSchema } from "@workspace/core/validators"

export function scraperRequestUrl(
  configuredUrl: string,
  targetUrl: string
): URL | null {
  const base = domainSettingSchema.shape.url_scraping.parse(configuredUrl)
  if (!base) return null
  const url = new URL(base)
  // Older settings may already include /scraper. Do not append it twice.
  const path = url.pathname.replace(/\/+$/, "")
  url.pathname = path.endsWith("/scraper") ? path : `${path}/scraper`
  url.searchParams.set("url", targetUrl)
  return url
}
