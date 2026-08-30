"use client"

import type { Short } from "@workspace/core/types"
import { ArrowLeft, Captions, ExternalLink, Flag, ListVideo, Menu, MessageSquare, MoreVertical, Search, Trash2, Volume2, X } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { useRouter } from "@/i18n/navigation"

export function ShortMobileControls({ short }: { short: Short }) {
  const router = useRouter()
  const t = useTranslations("video.shorts.mobile")
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [recent, setRecent] = React.useState(["nextjs", t("recent.design"), t("recent.music")])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    setRecent((items) => [value, ...items.filter((item) => item !== value)].slice(0, 5))
    setSearchOpen(false)
    router.push(`/search?q=${encodeURIComponent(value)}`)
  }

  return <>
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-2 pt-[max(.5rem,env(safe-area-inset-top))] pb-8 text-white lg:hidden"><button type="button" onClick={() => router.back()} aria-label={t("back")} className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/20"><ArrowLeft className="size-6" /></button><div className="flex space-x-1"><button type="button" onClick={() => setSearchOpen(true)} aria-label={t("search")} className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/20"><Search className="size-6" /></button><button type="button" onClick={() => setMoreOpen(true)} aria-label={t("more")} className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/20"><MoreVertical className="size-6" /></button></div></div>
    {searchOpen ? <div className="fixed inset-0 z-[70] bg-background text-foreground lg:hidden"><form onSubmit={submit} className="flex h-14 items-center gap-2 border-b px-2"><button type="button" onClick={() => setSearchOpen(false)} aria-label={t("back")} className="grid size-10 place-items-center"><ArrowLeft className="size-5" /></button><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className="h-10 min-w-0 flex-1 rounded-full bg-muted px-4 text-sm outline-none" /><button type="submit" aria-label={t("search")} className="grid size-10 place-items-center"><Search className="size-5" /></button></form><div className="divide-y">{recent.map((item) => <div key={item} className="flex items-center gap-3 px-3 py-3 text-sm"><Search className="size-4 text-muted-foreground" /><button type="button" onClick={() => setQuery(item)} className="min-w-0 flex-1 text-left">{item}</button><button type="button" onClick={() => setRecent((items) => items.filter((value) => value !== item))} aria-label={t("deleteSearch")} className="text-primary"><Trash2 className="size-4" /></button></div>)}</div></div> : null}
    {moreOpen ? <div className="fixed inset-0 z-[70] bg-black/60 lg:hidden" onClick={() => setMoreOpen(false)}><section role="dialog" aria-modal="true" aria-label={t("more")} onClick={(event) => event.stopPropagation()} className="absolute inset-x-2 bottom-[max(.5rem,env(safe-area-inset-bottom))] overflow-hidden rounded-2xl bg-background text-foreground shadow-2xl"><div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" /><header className="flex items-center justify-between px-5 py-3"><p className="line-clamp-1 text-sm font-semibold">{short.title}</p><button type="button" onClick={() => setMoreOpen(false)} aria-label={t("close")}><X className="size-5" /></button></header><div className="pb-3">{[
      [Menu, "description"], [ListVideo, "savePlaylist"], [Captions, "captions"], [Volume2, "audioTrack"], [Flag, "report"], [MessageSquare, "feedback"], [ExternalLink, "openApp"],
    ].map(([Icon, key]) => { const ItemIcon = Icon as typeof Menu; return <button key={key as string} type="button" onClick={() => setMoreOpen(false)} className="flex w-full items-center gap-5 px-5 py-3 text-left text-sm hover:bg-muted"><ItemIcon className="size-5" /><span className="flex-1">{t(key as "description")}</span>{key === "audioTrack" ? <span className="text-xs text-muted-foreground">{t("thaiOriginal")}</span> : null}</button> })}</div></section></div> : null}
  </>
}
