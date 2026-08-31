import { NextRequest, NextResponse } from "next/server"

import { UserRole } from "@workspace/core/enums"
import {
  defaultLocale,
  localeCookieMaxAge,
  localeCookieName,
  normalizeLocale,
} from "@workspace/i18n/config"

import { localeCookieDomain } from "@/i18n/locale-cookie"

const authApiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000"
const adminUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3001"
const allowedRoles = new Set<string>([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.DEVELOPER,
])

type ProxySession = {
  user?: { id?: string; role?: string }
}

export async function proxy(req: NextRequest) {
  const session = await getSession(req)

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", getCookieDomainOrigin(req))
    loginUrl.searchParams.set("callbackUrl", adminUrl)
    return withLocaleCookie(req, NextResponse.redirect(loginUrl))
  }

  if (!session.user.role || !allowedRoles.has(session.user.role)) {
    return withLocaleCookie(req, NextResponse.redirect(new URL("/", getCookieDomainOrigin(req))))
  }

  return withLocaleCookie(req, NextResponse.next())
}

function getCookieDomainOrigin(req: NextRequest) {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim().replace(/^\./, "")
  if (!domain) return process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"

  const protocol = req.headers.get("x-forwarded-proto")
    ?? req.nextUrl.protocol.replace(":", "")
  return `${protocol}://${domain}`
}

async function getSession(req: NextRequest): Promise<ProxySession | null> {
  try {
    const response = await fetch(new URL("/api/auth/get-session", authApiUrl), {
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        "user-agent": req.headers.get("user-agent") ?? "",
      },
      cache: "no-store",
    })

    return response.ok ? await response.json() as ProxySession : null
  } catch (error) {
    console.error("[Admin Proxy] Failed to retrieve session", error)
    return null
  }
}

function withLocaleCookie(req: NextRequest, response: NextResponse) {
  if (req.cookies.has(localeCookieName)) return response

  const locale = normalizeLocale(req.headers.get("accept-language")) ?? defaultLocale
  response.cookies.set(localeCookieName, locale, {
    ...(localeCookieDomain ? { domain: localeCookieDomain } : {}),
    path: "/",
    maxAge: localeCookieMaxAge,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  return response
}

export const config = {
  matcher: [
    "/((?!api|assets|_next|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|opengraph-image|twitter-image|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)",
  ],
}
