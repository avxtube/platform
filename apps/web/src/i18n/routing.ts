import { defineRouting } from "next-intl/routing"

import {
  defaultLocale,
  localeCookieMaxAge,
  localeCookieName,
  locales,
} from "@workspace/i18n/config"

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
  localeCookie: {
    name: localeCookieName,
    maxAge: localeCookieMaxAge,
    sameSite: "lax",
  },
})
