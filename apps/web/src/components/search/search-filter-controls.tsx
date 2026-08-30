"use client"

import * as React from "react"
import { SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"
import { useRouter } from "@/i18n/navigation"

export type SearchFilterState = { q: string; type: string; duration: string; uploaded: string; feature: string; sort: string; watched: string }

const quickFilters = [
  { key: "all", values: { type: "all", watched: "any", sort: "relevance" } },
  { key: "shorts", values: { type: "short" } },
  { key: "unwatched", values: { watched: "unwatched" } },
  { key: "watched", values: { watched: "watched" } },
  { key: "videos", values: { type: "video" } },
  { key: "latest", values: { sort: "latest" } },
  { key: "live", values: { type: "live" } },
] as const

const columns = [
  { key: "type", options: ["video", "short", "live"] },
  { key: "duration", options: ["short", "medium", "long"] },
  { key: "uploaded", options: ["today", "week", "month", "year"] },
  { key: "feature", options: ["hd", "4k", "captions"] },
  { key: "sort", options: ["relevance", "latest", "views"] },
] as const

function isAll(state: SearchFilterState) { return state.type === "all" && state.duration === "any" && state.uploaded === "any" && state.feature === "any" && state.sort === "relevance" && state.watched === "any" }

export function SearchFilterControls({ state }: { state: SearchFilterState }) {
  const router = useRouter()
  const t = useTranslations("video.search")
  const [open, setOpen] = React.useState(false)
  const navigate = React.useCallback((values: Partial<SearchFilterState>, reset = false) => {
    const merged = reset ? { ...state, type: "all", duration: "any", uploaded: "any", feature: "any", sort: "relevance", watched: "any", ...values } : { ...state, ...values }
    const next = new URLSearchParams()
    if (merged.q) next.set("q", merged.q)
    for (const key of ["type", "duration", "uploaded", "feature", "sort", "watched"] as const) {
      const value = merged[key]
      if (value !== "any" && !(key === "type" && value === "all") && !(key === "sort" && value === "relevance")) next.set(key, value)
    }
    setOpen(false)
    router.push(`/search${next.size ? `?${next}` : ""}`)
  }, [router, state])

  return <div className="flex items-center gap-2 overflow-x-auto pb-1"><div className="flex min-w-max gap-2">{quickFilters.map((filter, index) => { const active = index === 0 ? isAll(state) : Object.entries(filter.values).every(([key, value]) => state[key as keyof SearchFilterState] === value); return <button key={filter.key} type="button" onClick={() => navigate(filter.values, index === 0)} className={cn("h-9 rounded-lg px-4 text-sm font-semibold transition-colors", active ? "bg-foreground text-background" : "bg-muted hover:bg-accent")}>{t(`quick.${filter.key}`)}</button> })}</div><button type="button" className="ml-auto flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold hover:bg-muted" onClick={() => setOpen(true)}>{t("filters")}<SlidersHorizontal className="size-4" /></button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl gap-5 p-5 sm:max-w-3xl"><DialogHeader><DialogTitle>{t("filterTitle")}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-x-7 gap-y-6 sm:grid-cols-3 md:grid-cols-5">{columns.map((column) => <section key={column.key}><h3 className="border-b pb-3 text-sm font-semibold">{t(`columns.${column.key}`)}</h3><div className="mt-2 flex flex-col items-start">{column.options.map((value) => { const active = state[column.key] === value; const fallback = column.key === "type" ? "all" : column.key === "sort" ? "relevance" : "any"; return <button key={value} type="button" onClick={() => navigate({ [column.key]: active ? fallback : value })} className={cn("py-2 text-left text-sm text-muted-foreground hover:text-foreground", active && "font-semibold text-foreground")}>{t(`options.${column.key}.${value}`)}</button> })}</div></section>)}</div></DialogContent></Dialog></div>
}
