"use client"

import * as React from "react"
import {
  Clapperboard,
  ExternalLink,
  FileText,
  Languages,
  LayoutDashboard,
  Menu,
  Moon,
  Radio,
  Sun,
  Video,
  X,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import {
  localeCookieMaxAge,
  localeCookieName,
  type Locale,
} from "@workspace/i18n/config"
import { Button, buttonVariants } from "@workspace/ui/components"

import { writeLocaleCookie } from "@/i18n/locale-cookie"

const navigation = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/contents/video", key: "video", icon: Video },
  { href: "/contents/short", key: "short", icon: Clapperboard },
  { href: "/contents/post", key: "post", icon: FileText },
  { href: "/contents/live", key: "live", icon: Radio },
] as const

export function AdminShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name?: string; email?: string; role?: string }
}) {
  const t = useTranslations("admin")
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={() => setOpen(false)} className="flex h-16 items-center gap-3 border-b px-5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Video className="size-5" />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm">{t("brand")}</strong>
          <span className="block truncate text-xs text-muted-foreground">{t("adminDashboard")}</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map(({ href, key, icon: Icon }, index) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <React.Fragment key={href}>
              {index === 1 ? <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("content")}</p> : null}
              <Link href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="size-[18px]" />
                {key === "dashboard" ? t("dashboard") : t(`kinds.${key}`)}
              </Link>
            </React.Fragment>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <p className="truncate text-sm font-semibold">{user.name ?? user.email ?? "Admin"}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{t("role", { role: user.role ?? "-" })}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-svh bg-muted/25 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:block">{sidebar}</aside>
      {open ? <div className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label={t("closeMenu")} className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-[min(82vw,18rem)] bg-background shadow-2xl">{sidebar}<button type="button" aria-label={t("closeMenu")} onClick={() => setOpen(false)} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full hover:bg-muted"><X className="size-5" /></button></aside></div> : null}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-xl sm:px-6">
        <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={t("menu")} className="lg:hidden"><Menu className="size-5" /></Button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t("adminDashboard")}</p></div>
        <LanguageButton />
        <ThemeButton />
        <a href={process.env.NEXT_PUBLIC_WEB_URL ?? process.env.NEXT_PUBLIC_URL?.replace("://admin.", "://") ?? "http://localhost:3000"} target="_blank" rel="noreferrer" className={`${buttonVariants({ variant: "outline", size: "sm" })} hidden sm:inline-flex`}><ExternalLink className="size-4" />{t("openSite")}</a>
      </header>
      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}

function LanguageButton() {
  const t = useTranslations("admin")
  const locale = useLocale() as Locale
  const router = useRouter()
  const nextLocale: Locale = locale === "th" ? "en" : "th"

  return <Button type="button" variant="ghost" size="sm" aria-label={t("language")} onClick={() => { writeLocaleCookie(localeCookieName, nextLocale, localeCookieMaxAge); router.refresh() }}><Languages className="size-4" /><span className="hidden sm:inline">{nextLocale.toUpperCase()}</span></Button>
}

function ThemeButton() {
  const t = useTranslations("admin")
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(React.useCallback(() => () => {}, []), React.useCallback(() => true, []), React.useCallback(() => false, []))
  const dark = mounted && resolvedTheme === "dark"

  return <Button type="button" variant="ghost" size="icon" aria-label={t("theme")} onClick={() => setTheme(dark ? "light" : "dark")}>{dark ? <Sun className="size-5" /> : <Moon className="size-5" />}</Button>
}
