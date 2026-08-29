export const locales = [
  "en",
  "th",
  // "id",
  // "ko",
  // "vi",
  // "zh",
  // "ja",
  // "fr",
  // "de",
  // "es",
  // "pt",
  // "ru",
  // "ar",
  // "tr",
  // "hi",
  // "ms",
  // "tl",
] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"
export const localeCookieName = "NEXT_LOCALE"
export const localeCookieMaxAge = 60 * 60 * 24 * 365

export const localeLabels: Record<Locale, string> = {
  en: "English",
  th: "ไทย",
  // id: "Bahasa Indonesia",
  // ko: "한국어",
  // vi: "Tiếng Việt",
  // zh: "中文",
  // ja: "日本語",
  // fr: "Français",
  // de: "Deutsch",
  // es: "Español",
  // pt: "Português",
  // ru: "Русский",
  // ar: "العربية",
  // tr: "Türkçe",
  // hi: "हिन्दी",
  // ms: "Bahasa Melayu",
  // tl: "Filipino",
}

export const localeTags: Record<Locale, string> = {
  en: "en-US",
  th: "th-TH",
  // id: "id-ID",
  // ko: "ko-KR",
  // vi: "vi-VN",
  // zh: "zh-CN",
  // ja: "ja-JP",
  // fr: "fr-FR",
  // de: "de-DE",
  // es: "es-ES",
  // pt: "pt-BR",
  // ru: "ru-RU",
  // ar: "ar-SA",
  // tr: "tr-TR",
  // hi: "hi-IN",
  // ms: "ms-MY",
  // tl: "fil-PH",
}

export const localeCountryCodes = {
  en: "US",
  th: "TH",
  // id: "ID",
  // ko: "KR",
  // vi: "VN",
  // zh: "CN",
  // ja: "JP",
  // fr: "FR",
  // de: "DE",
  // es: "ES",
  // pt: "BR",
  // ru: "RU",
  // ar: "SA",
  // tr: "TR",
  // hi: "IN",
  // ms: "MY",
  // tl: "PH",
} as const satisfies Record<Locale, string>

export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  th: "ltr",
  // id: "ltr",
  // ko: "ltr",
  // vi: "ltr",
  // zh: "ltr",
  // ja: "ltr",
  // fr: "ltr",
  // de: "ltr",
  // es: "ltr",
  // pt: "ltr",
  // ru: "ltr",
  // ar: "rtl",
  // tr: "ltr",
  // hi: "ltr",
  // ms: "ltr",
  // tl: "ltr",
}

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale)
}

export function normalizeLocale(
  value: string | null | undefined
): Locale | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()
  if (isLocale(normalized)) return normalized

  const language = normalized.split("-")[0]
  return isLocale(language) ? language : null
}
