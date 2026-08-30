import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"

import { safeRedirectPath } from "@workspace/core/utils"
import {
  defaultLocale,
  isLocale,
  localeCookieMaxAge,
  localeCookieName,
  normalizeLocale,
  type Locale,
} from "@workspace/i18n/config"

import { localeCookieDomain } from "@/i18n/locale-cookie"
import { routing } from "@/i18n/routing"

const authApiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000"
const handleI18nRouting = createMiddleware(routing)

type ProxySession = {
  user?: {
    id?: string
  }
}

type ProxyCookie = {
  name: string
  value: string
}

const AuthRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/set-password",
  "/verify-2fa",
  "/verify-email",
  "/error",
  "/magic-link",
]

// ทุกหน้าเป็น public โดยค่าเริ่มต้น เพิ่มเฉพาะ route ที่ต้องเข้าสู่ระบบไว้ที่นี่
const ProtectedRoutes = ["/account", "/admin", "/history", "/studio"]

const Auth2FARoute = "/verify-2fa"

export async function proxy(req: NextRequest) {
  const pathName = req.nextUrl.pathname
  const routeLocale = getPathLocale(pathName)
  const routePathName = stripPathLocale(pathName)

  // 1. Read authentication cookies
  // ไม่ผูกกับ cookie prefix ของแต่ละ environment; API จะเป็นผู้ตรวจ token จริงอีกครั้ง
  const cookies = req.cookies.getAll()
  const sessionCookie = cookies.find(({ name }) =>
    name.endsWith(".session_token")
  )
  const twoFactorCookie = cookies.find(({ name }) =>
    name.endsWith(".two_factor")
  )

  // 2. Identify Route Types
  const isOAuthCallback = routePathName.startsWith("/oauth-callback")
  const isAuthRoute = AuthRoutes.some((route) =>
    matchesRoute(routePathName, route)
  )
  const isProtectedRoute = ProtectedRoutes.some((route) =>
    matchesRoute(routePathName, route)
  )
  const isLocalizedRoute = !isProtectedRoute
  const cookieLocale = normalizeLocale(
    req.cookies.get(localeCookieName)?.value
  )
  const browserLocale = getBrowserLocale(
    req.headers.get("accept-language")
  )
  const dashboardLocale = cookieLocale ?? browserLocale ?? defaultLocale

  // Public pages do not make routing decisions from the session.
  // Resolve it only for auth/protected routes, or while a 2FA flow is pending.
  const shouldResolveSession =
    Boolean(sessionCookie) &&
    (isAuthRoute || isProtectedRoute || Boolean(twoFactorCookie))
  const session = shouldResolveSession ? await getSession(req) : null

  // 3. Construct URLs
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host
  const protocol =
    req.headers.get("x-forwarded-proto") ||
    req.nextUrl.protocol.replace(":", "") ||
    "http"
  const currentUrl = `${protocol}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`
  const accountsUrl = `${protocol}://${host}`

  // 4. Process Routing Logic
  const authResponse = getRoutingDecision(req, {
    pathName: routePathName,
    locale: routeLocale ?? (isLocalizedRoute ? defaultLocale : dashboardLocale),
    session,
    twoFactorCookie,
    isAuthRoute,
    isProtectedRoute,
    isOAuthCallback,
    currentUrl,
    accountsUrl,
  })

  // 5. Post-process: Persist referral cookie (?ref=xxx) — first click wins, อายุ 7 วัน
  // response = appendReferralCookie(req, response);

  // 6. Post-process: Persist callbackUrl cookie if navigating to Auth Routes
  const response =
    isLocalizedRoute && isPassThrough(authResponse)
      ? handleI18nRouting(req)
      : authResponse

  const callbackResponse = appendCallbackCookie(req, response, isAuthRoute)

  return appendInitialLocaleCookie(
    req,
    callbackResponse,
    routeLocale ?? dashboardLocale
  )
}

async function getSession(req: NextRequest): Promise<ProxySession | null> {
  const startedAt = performance.now()
  let responseStatus: number | "network-error" = "network-error"

  try {
    const headers = new Headers()
    headers.set("cookie", req.headers.get("cookie") ?? "")

    const userAgent = req.headers.get("user-agent")
    if (userAgent) headers.set("user-agent", userAgent)

    const response = await fetch(new URL("/api/auth/get-session", authApiUrl), {
      method: "GET",
      headers,
      cache: "no-store",
    })
    responseStatus = response.status

    if (!response.ok) {
      return null
    }

    return (await response.json()) as ProxySession | null
  } catch (error) {
    console.error("[Proxy] Failed to retrieve auth session", error)
    return null
  } finally {
    const durationMs = Math.round(performance.now() - startedAt)
    console.info(
      `[Proxy] getSession took ${durationMs}ms status=${responseStatus} path=${req.nextUrl.pathname}`
    )
  }
}

// ==========================================
// Helper Functions for Routing Logic
// ==========================================

function getRoutingDecision(
  req: NextRequest,
  ctx: {
    pathName: string
    locale: Locale
    session: ProxySession | null
    twoFactorCookie: ProxyCookie | undefined
    isAuthRoute: boolean
    isProtectedRoute: boolean
    isOAuthCallback: boolean
    currentUrl: string
    accountsUrl: string
  }
): NextResponse {
  const {
    pathName,
    locale,
    session,
    twoFactorCookie,
    isAuthRoute,
    isProtectedRoute,
    isOAuthCallback,
    currentUrl,
    accountsUrl,
  } = ctx

  // Handle Social Login Errors
  if (pathName.startsWith("/api/auth/error")) {
    const errorParam = req.nextUrl.searchParams.get("error") || "unknown"
    const url = new URL(localizedPath("/login", locale), accountsUrl)
    url.searchParams.set("error", errorParam)
    return NextResponse.redirect(url)
  }

  // Allow /v1 API routes for unauthenticated users
  if (pathName.startsWith("/v1") && !session) {
    return NextResponse.next()
  }

  // Handle Missing 2FA Cookie when accessing 2FA Route
  if (pathName.startsWith(Auth2FARoute) && !twoFactorCookie) {
    return redirectTo(
      accountsUrl,
      localizedPath("/login", locale),
      getCallbackUrl(req, currentUrl)
    )
  }

  // Force 2FA verification if 2FA cookie exists but session is not established
  if (twoFactorCookie && !pathName.startsWith(Auth2FARoute) && !session) {
    const callbackUrl =
      req.nextUrl.searchParams.get("callbackUrl") ||
      (!isAuthRoute ? currentUrl : null)
    return redirectTo(
      accountsUrl,
      localizedPath(Auth2FARoute, locale),
      callbackUrl
    )
  }

  // Restrict access to Protected Routes for unauthenticated users
  if (!session && isProtectedRoute) {
    return redirectTo(
      accountsUrl,
      localizedPath("/login", locale),
      currentUrl
    )
  }

  // Redirect authenticated users away from Auth Routes (e.g. /login)
  if (session && isAuthRoute && !isOAuthCallback) {
    // safeRedirectPath: รับเฉพาะ path ภายใน กัน ?callbackUrl=https://evil.com พาออกนอกเว็บ
    const callbackUrl = safeRedirectPath(
      req.nextUrl.searchParams.get("callbackUrl") ||
        req.cookies.get("auth_callback_url")?.value
    )
    const res = NextResponse.redirect(
      new URL(callbackUrl || localizedPath("/", locale), currentUrl)
    )
    if (callbackUrl) {
      res.cookies.delete("auth_callback_url")
      res.headers.set("x-auth-resolved", "1") // Flag to prevent appendCallbackCookie from re-setting it
    }
    return res
  }

  // Default: Allow request
  return NextResponse.next()
}

function getPathLocale(pathname: string): Locale | null {
  const segment = pathname.split("/").filter(Boolean)[0]
  return isLocale(segment) ? segment : null
}

function stripPathLocale(pathname: string) {
  const locale = getPathLocale(pathname)
  if (!locale) return pathname || "/"

  const stripped = pathname.slice(locale.length + 1)
  return stripped || "/"
}

function localizedPath(pathname: string, locale: Locale) {
  if (locale === defaultLocale) return pathname
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`
}

function getBrowserLocale(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null

  const preferences = acceptLanguage
    .split(",")
    .map((entry, index) => {
      const [languageTag, ...parameters] = entry.trim().split(";")
      const qualityValue = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="))
        ?.slice(2)
      const parsedQuality = qualityValue ? Number(qualityValue) : 1

      return {
        index,
        languageTag,
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
      }
    })
    .filter(({ quality }) => quality > 0)
    .sort((left, right) =>
      right.quality === left.quality
        ? left.index - right.index
        : right.quality - left.quality
    )

  for (const { languageTag } of preferences) {
    const locale = normalizeLocale(languageTag)
    if (locale) return locale
  }

  return null
}

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

function isPassThrough(response: NextResponse) {
  return response.headers.get("x-middleware-next") === "1"
}

function redirectTo(
  baseUrl: string,
  path: string,
  callbackUrl?: string | null
) {
  const url = new URL(path, baseUrl)
  if (callbackUrl) url.searchParams.set("callbackUrl", callbackUrl)
  return NextResponse.redirect(url)
}

function getCallbackUrl(req: NextRequest, fallback: string) {
  return req.nextUrl.searchParams.get("callbackUrl") || fallback
}

// function appendReferralCookie(req: NextRequest, response: NextResponse) {
//     const ref = req.nextUrl.searchParams.get("ref");
//     if (!ref || !isValidReferralCode(ref)) return response;
//     // first click wins — มี cookie เดิมอยู่แล้วไม่ทับ
//     if (req.cookies.get(REFERRAL_COOKIE_NAME)) return response;

//     response.cookies.set(REFERRAL_COOKIE_NAME, ref, {
//         path: "/",
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         maxAge: REFERRAL_COOKIE_MAX_AGE,
//     });
//     return response;
// }

function appendCallbackCookie(
  req: NextRequest,
  response: NextResponse,
  isAuthRoute: boolean
) {
  if (response.headers.has("x-auth-resolved")) {
    response.headers.delete("x-auth-resolved")
    return response // Skip setting because it was explicitly deleted
  }

  const qCallbackUrl = req.nextUrl.searchParams.get("callbackUrl")
  if (qCallbackUrl && isAuthRoute) {
    response.cookies.set("auth_callback_url", qCallbackUrl, {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60, // 1 hour
    })
  }
  return response
}

function appendInitialLocaleCookie(
  req: NextRequest,
  response: NextResponse,
  locale: Locale
) {
  if (req.cookies.has(localeCookieName)) return response

  const fetchDestination = req.headers.get("sec-fetch-dest")
  if (fetchDestination && fetchDestination !== "document") return response

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
    "/api/auth/error",
    "/((?!api|assets|_next|__nextjs|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|opengraph-image|twitter-image|icon|apple-icon|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico|.*\\.json|\\.well-known).*)",
  ],
}
