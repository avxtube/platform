import { cookies } from "next/headers"
import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import {
  defaultLocale,
  localeCookieName,
  normalizeLocale,
  type Locale,
} from "@workspace/i18n/config"

import { routing } from "./routing"
import { loadAppMessages } from "./message-loaders"

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale
  let locale: Locale

  if (hasLocale(routing.locales, requestedLocale)) {
    locale = requestedLocale
  } else {
    // Routes outside [locale] (for example the future dashboard) use the
    // account preference cookie and intentionally remain unprefixed.
    const cookieLocale = normalizeLocale(
      (await cookies()).get(localeCookieName)?.value
    )
    locale = cookieLocale ?? defaultLocale
  }

  return {
    locale,
    messages: await loadAppMessages(locale),
  }
})
