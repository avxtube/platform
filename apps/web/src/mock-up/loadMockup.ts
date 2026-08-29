import type { Locale } from "@workspace/i18n/config"
import localeMeta from "./locale-meta.json"

export async function loadMetadataMockup(locale: Locale) {
    const data: Record<Locale, { title: string, description: string, siteName: string, keywords?: string[] }> = localeMeta

    return {
        ...data[locale]
    }
}