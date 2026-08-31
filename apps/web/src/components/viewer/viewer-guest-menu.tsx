"use client"

import * as React from "react"
import {
  ArrowLeft,
  BadgeInfo,
  Check,
  ChevronRight,
  CircleHelp,
  Globe2,
  Keyboard,
  Languages,
  MessageSquareWarning,
  Moon,
  Settings,
  Sun,
  UserRoundCog,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useLocale, useTranslations } from "next-intl"
import { useRouter as useNextRouter } from "next/navigation"

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
import { getPathname, Link, usePathname } from "@/i18n/navigation"

export function ViewerGuestMenu({ onSelect }: { onSelect: () => void }) {
  const t = useTranslations("viewer.account")
  const locale = useLocale()
  const pathname = usePathname()
  const nextRouter = useNextRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [languageMenuOpen, setLanguageMenuOpen] = React.useState(false)
  const [restrictedMode, setRestrictedMode] = React.useState(false)
  const mounted = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    React.useCallback(() => true, []),
    React.useCallback(() => false, []),
  )
  const isDark = mounted && resolvedTheme === "dark"

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
    return <PopoverContent align="end" sideOffset={10} className="w-80 max-w-[calc(100vw-24px)] gap-0 overflow-hidden rounded-xl p-0">
      <div className="flex items-center gap-3 border-b p-3"><button type="button" aria-label={t("back")} onClick={() => setLanguageMenuOpen(false)} className="flex size-9 items-center justify-center rounded-full hover:bg-muted"><ArrowLeft className="size-5" /></button><p className="font-semibold">{t("languageTitle")}</p></div>
      <div className="py-2">{locales.map((item) => <button key={item} type="button" onClick={() => isLocale(item) && changeLocale(item)} className="flex w-full items-center gap-4 px-4 py-3 text-sm hover:bg-muted"><CountryFlag countryCode={localeCountryCodes[item]} shape="circle" size={5} aria-hidden="true" /><span className="flex-1 text-left">{localeLabels[item]}</span>{item === locale ? <Check className="size-5 text-primary" /> : null}</button>)}</div>
    </PopoverContent>
  }

  return <PopoverContent align="end" sideOffset={10} className="w-80 max-w-[calc(100vw-24px)] gap-0 overflow-hidden rounded-xl p-0">
    <div className="border-b py-2">
      <Link href="/account" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted"><BadgeInfo className="size-5" />{t("yourData")}</Link>
      <button type="button" className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted" onClick={() => setTheme(isDark ? "light" : "dark")}>{isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}{t("theme", { theme: t(isDark ? "themeDark" : "themeLight") })}</button>
      <button type="button" onClick={() => setLanguageMenuOpen(true)} className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted"><Languages className="size-5" /><span className="flex-1 text-left">{t("language", { language: localeLabels[locale as Locale] })}</span><ChevronRight className="size-4 text-muted-foreground" /></button>
      <button type="button" onClick={() => setRestrictedMode((value) => !value)} className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted"><UserRoundCog className="size-5" /><span className="flex-1 text-left">{t("restrictedMode", { mode: t(restrictedMode ? "restrictedOn" : "restrictedOff") })}</span><ChevronRight className="size-4 text-muted-foreground" /></button>
      <button type="button" className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted"><Globe2 className="size-5" /><span className="flex-1 text-left">{t("country", { country: t("countryName") })}</span><ChevronRight className="size-4 text-muted-foreground" /></button>
      <button type="button" className="flex w-full items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted"><Keyboard className="size-5" />{t("shortcuts")}</button>
    </div>
    <div className="border-b py-2"><Link href="/settings" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted"><Settings className="size-5" />{t("settings")}</Link></div>
    <div className="py-2">
      <Link href="/help" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted"><CircleHelp className="size-5" />{t("help")}</Link>
      <Link href="/feedback" onClick={onSelect} className="flex items-center gap-4 px-4 py-2.5 text-sm hover:bg-muted"><MessageSquareWarning className="size-5" />{t("feedback")}</Link>
    </div>
  </PopoverContent>
}
