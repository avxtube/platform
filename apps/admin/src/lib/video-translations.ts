export type ImportedTranslations = Record<
  string,
  { locale: string; title: string; description: string }
>

type TranslationResponse = {
  success?: boolean
  error?: string
  data?: { title?: string; content?: string }
}

export async function fetchImportedTranslations(
  sourceUrl: string,
  locales: readonly string[],
  request: typeof fetch = fetch
): Promise<ImportedTranslations> {
  const translated: ImportedTranslations = {}
  for (const locale of locales) {
    const response = await request(
      `/api/import/video?url=${encodeURIComponent(sourceUrl)}&locale=${encodeURIComponent(locale)}`,
      { headers: { accept: "application/json" } }
    )
    const body = (await response
      .json()
      .catch(() => null)) as TranslationResponse | null
    if (response.status === 404) continue
    if (!response.ok || !body?.data || body.success === false)
      throw new Error(body?.error ?? `Unable to import ${locale} translation`)
    const title = body.data.title?.trim() ?? ""
    const description = body.data.content?.trim() ?? ""
    if (title || description)
      translated[locale] = { locale, title, description }
  }
  return translated
}
