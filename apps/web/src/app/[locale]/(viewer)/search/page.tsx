import type { Locale } from "@workspace/i18n/config"
import { searchContent } from "@workspace/services/queries/video"
import { getTranslations } from "next-intl/server"
import {
  SearchFilterControls,
  type SearchFilterState,
} from "@/components/search/search-filter-controls"
import { SearchResults } from "@/components/search/search-results"
import { createPageMetadata } from "@/i18n/metadata"

export const dynamic = "force-dynamic"
function value(
  params: Record<string, string | string[] | undefined>,
  key: string,
  fallback: string
) {
  const current = params[key]
  return (Array.isArray(current) ? current[0] : current) ?? fallback
}

type SearchPageProps = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  params,
  searchParams,
}: SearchPageProps) {
  const [{ locale }, raw, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("video.search"),
  ])
  const query = value(raw, "q", "").trim()
  const metadata = await createPageMetadata({
    locale,
    pathname: "/search",
    title: query ? `${t("resultLabel")}: ${query}` : t("allVideos"),
  })
  return { ...metadata, robots: { index: false, follow: true } }
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const [{ locale }, raw, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("video.search"),
  ])
  const state: SearchFilterState = {
    q: value(raw, "q", ""),
    type: value(raw, "type", "all"),
    duration: value(raw, "duration", "any"),
    uploaded: value(raw, "uploaded", "any"),
    feature: value(raw, "feature", "any"),
    sort: value(raw, "sort", "relevance"),
    watched: value(raw, "watched", "any"),
  }
  const result = await searchContent(state, locale).catch(() => ({
    videos: [],
    shorts: [],
    actors: [],
    playlists: [],
    total: 0,
  }))
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <header className="border-b pb-3">
        <SearchFilterControls state={state} />
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-primary">
              {t("resultLabel")}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.03em]">
              {state.q ? `“${state.q}”` : t("allVideos")}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("resultCount", { count: result.total })}
          </p>
        </div>
      </header>
      <SearchResults result={result} query={state.q} locale={locale} />
    </div>
  )
}
