"use client"

import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"

import {
  isLocale,
  localeCookieMaxAge,
  localeCookieName,
  localeCountryCodes,
  localeLabels,
  locales,
  type Locale,
} from "@workspace/i18n/config"
import {
  CountryFlag,
  SmartSelect,
  type SmartSelectOption,
} from "@workspace/ui/components"

import { localeCookieDomain } from "@/i18n/locale-cookie"
import { getPathname, usePathname } from "@/i18n/navigation"

const languageOptions: SmartSelectOption[] = locales.map((locale) => ({
  value: locale,
  label: localeLabels[locale],
  description: locale.toUpperCase(),
  icon: (
    <CountryFlag
      countryCode={localeCountryCodes[locale]}
      shape="circle"
      size={4}
      aria-hidden="true"
    />
  ),
}))

export function LanguageSwitcher() {
  const locale = useLocale()
  const messages = useTranslations("shared.language")
  const pathname = usePathname()
  const router = useRouter()

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return

    const localizedPathname = getPathname({
      href: pathname,
      locale: nextLocale,
    })
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    const domain = localeCookieDomain
      ? `; Domain=${localeCookieDomain}`
      : ""

    document.cookie = `${localeCookieName}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=${localeCookieMaxAge}; SameSite=Lax${domain}${secure}`
    router.replace(
      `${localizedPathname}${window.location.search}${window.location.hash}`,
      { scroll: false }
    )
  }

  return (
    <SmartSelect
      value={locale}
      options={languageOptions}
      ariaLabel={messages("label")}
      placeholder={messages("label")}
      searchPlaceholder={messages("label")}
      className="h-8 min-h-8 w-44 rounded-lg border-[var(--m-line)] bg-[var(--m-surface)] px-2 text-[11px] font-semibold tracking-[.02em] text-[var(--m-muted)] hover:bg-[var(--m-surface-subtle)] hover:text-[var(--m-text)]"
      renderValue={(selected) => (
        <span className="flex min-w-0 items-center gap-1.5">
          {selected[0]?.icon}
          <span className="truncate">{selected[0]?.label}</span>
        </span>
      )}
      onValueChange={(value) => {
        if (typeof value === "string" && isLocale(value)) {
          changeLocale(value)
        }
      }}
    />
  )
}
