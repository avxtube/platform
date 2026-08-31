import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { localeTags, locales, type Locale } from "@workspace/i18n/config"

import { contentMessageKey } from "./content-key"
import { getPathname } from "./navigation"

const siteUrl = "https://avxtube.org"

type PageMetadata = {
  locale: Locale
  pathname: string
  title: string
  description?: string
  keywords?: string[]
}

export type LocalizedPageProps = {
  params: Promise<{ locale: Locale }>
}

export async function getContentTranslator(locale: Locale) {
  const t = await getTranslations({ locale, namespace: "content" })

  return (text: string) => {
    const key = contentMessageKey(text)
    return t.has(key) ? (t.raw(key) as string) : text
  }
}

export async function createPageMetadata({
  locale,
  pathname,
  title,
  description,
  keywords,
}: PageMetadata): Promise<Metadata> {
  const translate = await getContentTranslator(locale)

  const englishPath = getPathname({ locale: "en", href: pathname })
  const localizedPath = getPathname({ locale, href: pathname })
  const languages = Object.fromEntries(
    locales.map((item) => [item, getPathname({ locale: item, href: pathname })])
  )
  const localizedTitle = translate(title)
  const localizedDescription = description
    ? translate(description)
    : undefined

  return {
    metadataBase: new URL(siteUrl),
    title: localizedTitle,
    description: localizedDescription,
    keywords: keywords?.map(translate),
    alternates: {
      canonical: localizedPath,
      languages: { ...languages, "x-default": englishPath },
    },
    openGraph: {
      type: "website",
      url: localizedPath,
      siteName: "VdoHide",
      locale: localeTags[locale].replace("-", "_"),
      title: localizedTitle,
      description: localizedDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: localizedTitle,
      description: localizedDescription,
    },
  }
}
