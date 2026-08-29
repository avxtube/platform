import "server-only"

import type { Locale } from "@workspace/i18n/config"

type Messages = Record<string, unknown>

const commonLoaders = {
  en: () =>
    import("@workspace/i18n/locales/en.json").then((item) => item.default),
  th: () =>
    import("@workspace/i18n/locales/th.json").then((item) => item.default),
} satisfies Record<Locale, () => Promise<Messages>>

const webLoaders = {
  en: () => import("./locales/en.json").then((item) => item.default),
  th: () => import("./locales/th.json").then((item) => item.default),
} satisfies Record<Locale, () => Promise<Messages>>

export async function loadAppMessages(locale: Locale) {
  const [shared, englishWeb, localeWeb] = await Promise.all([
    commonLoaders[locale](),
    webLoaders.en(),
    locale === "en" ? webLoaders.en() : webLoaders[locale](),
  ])

  return {
    shared,
    ...mergeMessages(englishWeb, localeWeb),
  }
}

export async function loadWebMessages(locale: Locale) {
  const [englishWeb, localeWeb] = await Promise.all([
    webLoaders.en(),
    locale === "en" ? webLoaders.en() : webLoaders[locale](),
  ])

  return mergeMessages(englishWeb, localeWeb)
}

function mergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base }

  for (const [key, value] of Object.entries(override)) {
    const baseValue = result[key]
    result[key] =
      isMessages(baseValue) && isMessages(value)
        ? mergeMessages(baseValue, value)
        : value
  }

  return result
}

function isMessages(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
