import { getCurrentUser } from "@workspace/auth/server"
import { UserRole } from "@workspace/core/enums"
import { type NextRequest, NextResponse } from "next/server"
import { getDomainSettings, getWorkerScraperSettings } from "@/lib/admin-api"
import { scraperRequestUrl } from "@/lib/scraper-url"

const allowedRoles = new Set<string>([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.DEVELOPER,
])

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user.userId)
    return NextResponse.json(
      { error: "Authentication is required" },
      { status: 401 }
    )
  if (!user.role || !allowedRoles.has(user.role))
    return NextResponse.json(
      { error: "Admin access is required" },
      { status: 403 }
    )

  const targetUrl = request.nextUrl.searchParams.get("url")?.trim()
  if (!targetUrl)
    return NextResponse.json({ error: "url is required" }, { status: 400 })

  try {
    // Reads the protected API (and database) with no-store on every import.
    const requestedLocale = request.nextUrl.searchParams.get("locale")?.trim()
    const [settings, workerSettings] = await Promise.all([
      getDomainSettings(),
      requestedLocale ? getWorkerScraperSettings() : Promise.resolve(null),
    ])
    if (
      requestedLocale &&
      !workerSettings?.missav.locales.some(
        (locale) => locale === requestedLocale
      )
    )
      return NextResponse.json(
        { error: "locale is not enabled in Worker Scraper settings" },
        { status: 400 }
      )
    const scraperUrl = scraperRequestUrl(
      settings.url_scraping,
      targetUrl,
      requestedLocale
    )
    if (!scraperUrl)
      return NextResponse.json(
        { error: "Configure Scraping in Settings → Domains before importing" },
        { status: 503 }
      )
    const response = await fetch(scraperUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body || typeof body !== "object") {
      return NextResponse.json(
        { error: `Scraper returned ${response.status}` },
        { status: response.status === 404 ? 404 : 502 }
      )
    }
    return NextResponse.json(body)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to import video"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
