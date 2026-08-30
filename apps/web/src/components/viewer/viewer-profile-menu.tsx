"use client"

import * as React from "react"
import {
  BadgeDollarSign,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleHelp,
  Globe2,
  Keyboard,
  Languages,
  LogOut,
  MessageSquareWarning,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useLocale, useTranslations } from "next-intl"
import { useRouter as useNextRouter } from "next/navigation"

import { authClient } from "@workspace/auth/client"
import {
  isLocale,
  localeCookieMaxAge,
  localeCookieName,
  localeCountryCodes,
  localeLabels,
  locales,
  type Locale,
} from "@workspace/i18n/config"
import { CountryFlag, PopoverContent } from "@workspace/ui/components"

import { writeLocaleCookie } from "@/i18n/locale-cookie"
import { getPathname, Link, usePathname, useRouter } from "@/i18n/navigation"

import { ViewerAvatar, type ViewerUser } from "./viewer-avatar"

const studioUrl = process.env.NEXT_PUBLIC_STUDIO_URL || "/studio"

export function ViewerProfileMenu({ user, onSelect }: { user: ViewerUser; onSelect: () => void }) {
  const t = useTranslations("viewer.account")
  const locale = useLocale()
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const nextRouter = useNextRouter()
  const pathname = usePathname()
  const [languageMenuOpen, setLanguageMenuOpen] = React.useState(false)
  const mounted = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    React.useCallback(() => true, []),
    React.useCallback(() => false, [])
  )
  const isDark = mounted && resolvedTheme === "dark"
  async function signOut(switchAccount = false) {
    onSelect()
    await authClient.signOut()
    if (switchAccount) router.push("/login")
    else router.refresh()
  }

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      setLanguageMenuOpen(false)
      return
    }

    const localizedPathname = getPathname({ href: pathname, locale: nextLocale })
    writeLocaleCookie(localeCookieName, nextLocale, localeCookieMaxAge)
    onSelect()
    nextRouter.replace(`${localizedPathname}${window.location.search}${window.location.hash}`, { scroll: false })
  }

  if (languageMenuOpen) {
    return (
      <PopoverContent align="end" sideOffset={10} className="w-80 max-w-[calc(100vw-24px)] gap-0 overflow-hidden rounded-xl p-0">
        <div className="flex items-center gap-3 border-b p-3">
          <button type="button" aria-label={t("back")} onClick={() => setLanguageMenuOpen(false)} className="flex size-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="size-5" />
          </button>
          <p className="font-semibold">{t("languageTitle")}</p>
        </div>
        <div className="py-2">
          {locales.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => isLocale(item) && changeLocale(item)}
              className="flex w-full items-center gap-4 px-4 py-3 text-sm hover:bg-muted"
            >
              <CountryFlag countryCode={localeCountryCodes[item]} shape="circle" size={5} aria-hidden="true" />
              <span className="flex-1 text-left">{localeLabels[item]}</span>
              {item === locale ? <Check className="size-5 text-primary" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    )
  }

  return (
    <PopoverContent align="end" sideOffset={10} className="w-80 max-w-[calc(100vw-24px)] gap-0 overflow-hidden rounded-xl p-0">
      <div className="flex gap-3 border-b p-4">
        <ViewerAvatar className="size-10" user={user} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name || user.email}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <Link href="/account" onClick={onSelect} className="mt-2 block text-sm text-blue-500 hover:underline">
            {t("viewMemberProfile")}
          </Link>
        </div>
      </div>

      <div className="border-b py-2">
        <Link href="/account" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <UserRound className="size-5" /> {t("myAccount")}
        </Link>
        <button type="button" onClick={() => void signOut(true)} className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <UsersRound className="size-5" /> {t("switchAccount")}
        </button>
        <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <LogOut className="size-5" /> {t("logout")}
        </button>
      </div>

      <div className="border-b py-2">
        <Link href={studioUrl} onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <ShieldCheck className="size-5" /> {t("studio")}
        </Link>
        <Link href="/account/membership" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <BadgeDollarSign className="size-5" /> {t("membership")}
        </Link>
      </div>

      <div className="border-b py-2">
        <button type="button" className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted" onClick={() => setTheme(isDark ? "light" : "dark")}>
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          {t("theme", { theme: t(isDark ? "themeDark" : "themeLight") })}
        </button>
        <button type="button" onClick={() => setLanguageMenuOpen(true)} className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <Languages className="size-5" /> <span className="flex-1 text-left">{t("language", { language: localeLabels[locale as Locale] })}</span><ChevronRight className="size-4 text-muted-foreground" />
        </button>
        <button type="button" className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <Globe2 className="size-5" /> {t("country", { country: t("countryName") })}
        </button>
        <button type="button" className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <Keyboard className="size-5" /> {t("shortcuts")}
        </button>
      </div>

      <div className="py-2">
        <Link href="/account/settings" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <Settings className="size-5" /> {t("settings")}
        </Link>
        <Link href="/help" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <CircleHelp className="size-5" /> {t("help")}
        </Link>
        <Link href="/feedback" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted">
          <MessageSquareWarning className="size-5" /> {t("feedback")}
        </Link>
      </div>
    </PopoverContent>
  )
}
