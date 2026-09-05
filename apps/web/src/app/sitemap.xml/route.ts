import { getSitemapSummary } from "@/lib/sitemap-data"
import { sitemapIndexXml } from "@/lib/sitemap-xml"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const summary = await getSitemapSummary()
    return xmlResponse(sitemapIndexXml(summary))
  } catch (error) {
    console.error("[Sitemap] Failed to build sitemap index", error)
    return new Response("Sitemap is temporarily unavailable", { status: 503 })
  }
}

function xmlResponse(body: string) {
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "no-store",
      "cdn-cache-control": "public, max-age=300",
    },
  })
}
