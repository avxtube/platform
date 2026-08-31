import { defineRouting } from "next-intl/routing"

import {
  defaultLocale,
  localeCookieMaxAge,
  localeCookieName,
  locales,
} from "@workspace/i18n/config"

import { localeCookieDomain } from "./locale-cookie"

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
  localeCookie: {
    name: localeCookieName,
    ...(localeCookieDomain ? { domain: localeCookieDomain } : {}),
    maxAge: localeCookieMaxAge,
    sameSite: "lax",
  },
})
