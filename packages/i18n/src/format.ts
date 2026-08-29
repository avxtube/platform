import { localeTags, type Locale } from "./config"

export function createNumberFormatter(
  locale: Locale,
  options?: Intl.NumberFormatOptions
) {
  return new Intl.NumberFormat(localeTags[locale], options)
}

export function createDateFormatter(
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(localeTags[locale], options)
}

export function createCurrencyFormatter(locale: Locale, currency = "USD") {
  return createNumberFormatter(locale, {
    style: "currency",
    currency,
  })
}
