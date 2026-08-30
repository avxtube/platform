"use client"

/* eslint-disable @next/next/no-img-element */

import type { HistoryContentType, HistoryEntry } from "@workspace/core/types"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components"
import { EllipsisVertical, Pause, Play, Search, Settings, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { Link } from "@/i18n/navigation"

type Filter = "all" | HistoryContentType

export function HistoryPage({ initialEntries, locale }: { initialEntries: HistoryEntry[]; locale: string }) {
  const t = useTranslations("video.historyPage")
  const [entries, setEntries] = React.useState(initialEntries)
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const [paused, setPaused] = React.useState(false)
  const normalizedQuery = query.trim().toLowerCase()
  const visible = entries.filter((entry) => (filter === "all" || entry.type === filter) && (!normalizedQuery || `${entry.content.title} ${entry.content.channel.name}`.toLowerCase().includes(normalizedQuery)))
  const shorts = visible.filter((entry) => entry.type === "short")
  const videos = visible.filter((entry) => entry.type !== "short")
  const remove = (id: string) => setEntries((current) => current.filter((entry) => entry.id !== id))

  return (
    <div className="grid gap-12 pb-10 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-20">
      <main className="min-w-0">
        <header><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1><div className="mt-4 flex flex-wrap gap-2">{(["all", "video", "short", "podcast", "music"] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${filter === item ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80"}`}>{t(`filters.${item}`)}</button>)}</div></header>
        {!visible.length ? <div className="mt-10 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">{t("empty")}</div> : <HistorySections shorts={shorts} videos={videos} locale={locale} onRemove={remove} />}
      </main>
      <aside className="space-y-7 lg:sticky lg:top-24 lg:self-start">
        <label className="flex items-center gap-3 border-b pb-3"><Search className="size-5" /><span className="sr-only">{t("search")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label>
        <div className="space-y-2"><button type="button" onClick={() => setEntries([])} className="flex w-full items-center gap-4 rounded-lg px-1 py-3 text-left text-sm font-medium hover:bg-muted"><Trash2 className="size-5" />{t("clear")}</button><button type="button" onClick={() => setPaused((value) => !value)} className="flex w-full items-center gap-4 rounded-lg px-1 py-3 text-left text-sm font-medium hover:bg-muted"><Pause className="size-5" />{t(paused ? "resume" : "pause")}</button><button type="button" className="flex w-full items-center gap-4 rounded-lg px-1 py-3 text-left text-sm font-medium hover:bg-muted"><Settings className="size-5" />{t("manage")}</button></div>
        <nav className="space-y-4 pl-8 text-sm text-muted-foreground" aria-label={t("otherHistory")}><p>{t("comments")}</p><p>{t("posts")}</p><p>{t("liveChat")}</p></nav>
      </aside>
    </div>
  )
}

function HistorySections({ shorts, videos, locale, onRemove }: { shorts: HistoryEntry[]; videos: HistoryEntry[]; locale: string; onRemove: (id: string) => void }) {
  const t = useTranslations("video.historyPage")
  return <div className="mt-8"><h2 className="text-xl font-bold">{t("today")}</h2>{shorts.length ? <section className="mt-7"><div className="mb-4 flex items-center gap-2"><span className="text-xl font-black text-primary">S</span><h3 className="text-xl font-bold">Shorts</h3></div><Carousel opts={{ align: "start", slidesToScroll: "auto" }} className="mx-10"><CarouselContent className="-ml-3">{shorts.map((entry) => <CarouselItem key={entry.id} className="basis-1/2 pl-3 sm:basis-1/3 xl:basis-1/4"><ShortCard entry={entry} locale={locale} onRemove={onRemove} /></CarouselItem>)}</CarouselContent><CarouselPrevious className="-left-10" aria-label={t("previousShorts")} /><CarouselNext className="-right-10" aria-label={t("nextShorts")} /></Carousel></section> : null}<div className="mt-8 divide-y">{videos.map((entry) => <HistoryVideoRow key={entry.id} entry={entry} locale={locale} onRemove={onRemove} />)}</div></div>
}

function ShortCard({ entry, locale, onRemove }: { entry: HistoryEntry; locale: string; onRemove: (id: string) => void }) {
  const t = useTranslations("video.historyPage")
  return <article className="group min-w-0"><Link href={`/shorts/${entry.content.id}`} className="block"><div className="relative aspect-[9/14] overflow-hidden rounded-xl bg-muted"><img src={entry.content.thumbnailUrl} alt="" className="size-full object-cover transition-transform group-hover:scale-[1.02]" /></div></Link><div className="mt-2 flex gap-1"><div className="min-w-0 flex-1"><h4 className="line-clamp-2 text-sm font-semibold">{entry.content.title}</h4><p className="mt-1 text-xs text-muted-foreground">{t("views", { count: formatNumber(entry.content.viewCount, locale) })}</p></div><button type="button" onClick={() => onRemove(entry.id)} aria-label={t("remove")} className="h-8"><EllipsisVertical className="size-4" /></button></div></article>
}

function HistoryVideoRow({ entry, locale, onRemove }: { entry: HistoryEntry; locale: string; onRemove: (id: string) => void }) {
  const t = useTranslations("video.historyPage")
  return <article className="group flex gap-4 py-4"><Link href={`/watch/${entry.content.id}`} className="relative aspect-video w-44 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-60"><img src={entry.content.thumbnailUrl} alt="" className="size-full object-cover transition-transform group-hover:scale-[1.02]" /><span className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"><Play className="size-4 fill-current" /></span><span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">{formatDuration(entry.content.durationSeconds)}</span></Link><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><Link href={`/watch/${entry.content.id}`} className="min-w-0 flex-1"><h3 className="line-clamp-2 font-semibold group-hover:text-primary">{entry.content.title}</h3></Link><button type="button" onClick={() => onRemove(entry.id)} aria-label={t("remove")}><EllipsisVertical className="size-5" /></button></div><p className="mt-2 text-xs text-muted-foreground">{entry.content.channel.name} • {t("views", { count: formatNumber(entry.content.viewCount, locale) })}</p><p className="mt-3 hidden line-clamp-2 text-sm text-muted-foreground sm:block">{entry.content.description}</p></div></article>
}

function formatNumber(value: number, locale: string) { return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value) }
function formatDuration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}` : `${minutes}:${String(rest).padStart(2, "0")}` }
