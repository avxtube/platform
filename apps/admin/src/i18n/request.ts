import { cookies } from "next/headers"
import { hasLocale, IntlErrorCode } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import {
  defaultLocale,
  defaultTimeZone,
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
    timeZone: defaultTimeZone,
    messages: await loadAppMessages(locale),
    onError(error) {
      if (error.code !== IntlErrorCode.MISSING_MESSAGE) {
        console.error(error)
      }
    },
    getMessageFallback({ key }) {
      return key
    },
  }
})
