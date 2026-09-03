import { getCurrentUser } from "@workspace/auth/server"
import { UserRole } from "@workspace/core/enums"
import { type NextRequest, NextResponse } from "next/server"

const allowedRoles = new Set<string>([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DEVELOPER])

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user.userId) return NextResponse.json({ error: "Authentication is required" }, { status: 401 })
  if (!user.role || !allowedRoles.has(user.role)) return NextResponse.json({ error: "Admin access is required" }, { status: 403 })

  const scraperUrl = process.env.SCRAPER_API?.replace(/\/$/, "")
  if (!scraperUrl) return NextResponse.json({ error: "SCRAPER_API is not configured" }, { status: 503 })
  const targetUrl = request.nextUrl.searchParams.get("url")?.trim()
  if (!targetUrl) return NextResponse.json({ error: "url is required" }, { status: 400 })

  try {
    const response = await fetch(`${scraperUrl}/scraper?url=${encodeURIComponent(targetUrl)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body || typeof body !== "object") {
      return NextResponse.json({ error: `Scraper returned ${response.status}` }, { status: 502 })
    }
    return NextResponse.json(body)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import video"
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
