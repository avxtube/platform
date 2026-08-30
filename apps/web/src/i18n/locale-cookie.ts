export const localeCookieDomain =
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN?.trim().replace(/^\./, "") || undefined

export function writeLocaleCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  const domain = localeCookieDomain ? `; Domain=${localeCookieDomain}` : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domain}${secure}`
}
