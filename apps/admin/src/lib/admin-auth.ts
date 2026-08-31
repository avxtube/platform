import "server-only"

import { getCurrentUser, type CurrentUser } from "@workspace/auth/server"
import { UserRole } from "@workspace/core/enums"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

const allowedRoles = new Set<string>([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.DEVELOPER,
])

export async function requireAdminUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  const adminUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3001"
  const requestHeaders = await headers()
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim().replace(/^\./, "")
  const accountOrigin = cookieDomain
    ? `${protocol}://${cookieDomain}`
    : process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"

  if (!user.userId) {
    const loginUrl = new URL("/login", accountOrigin)
    loginUrl.searchParams.set("callbackUrl", adminUrl)
    redirect(loginUrl.toString())
  }

  if (!user.role || !allowedRoles.has(user.role)) {
    redirect(new URL("/", accountOrigin).toString())
  }

  return user
}
