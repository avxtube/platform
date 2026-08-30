"use client"

import type { Channel } from "@workspace/core/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components"
import { BarChart3, CalendarDays, ExternalLink, Globe2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import * as React from "react"

export function ChannelInfoDialog({ channel }: { channel: Channel }) {
  const [open, setOpen] = React.useState(false)
  const locale = useLocale()
  const t = useTranslations("video.channel")
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(channel.joinedAt))
  const number = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })

  return <><button type="button" onClick={() => setOpen(true)} className="mt-2 text-sm font-semibold hover:text-primary">{t("more")}</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[80svh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{channel.name}</DialogTitle><DialogDescription>{t(`kind.${channel.kind}`)}</DialogDescription></DialogHeader><section className="space-y-6"><div><h2 className="font-bold">{t("description")}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{channel.description}</p></div>{channel.links.length ? <div><h2 className="font-bold">{t("links")}</h2><div className="mt-2 space-y-3">{channel.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-primary hover:underline"><ExternalLink className="size-4" />{link.label}</a>)}</div></div> : null}<div><h2 className="font-bold">{t("moreInfo")}</h2><dl className="mt-2 divide-y text-sm"><div className="flex items-center gap-3 py-3"><Globe2 className="size-5" /><dd>{channel.country ?? t("unknownCountry")}</dd></div><div className="flex items-center gap-3 py-3"><CalendarDays className="size-5" /><dd>{t("joinedDate", { date })}</dd></div><div className="flex items-center gap-3 py-3"><BarChart3 className="size-5" /><dd>{t("viewCount", { count: number.format(channel.viewCount) })}</dd></div></dl></div></section></DialogContent></Dialog></>
}
