"use client"

import * as React from "react"
import type { ViewerNotification } from "@workspace/core/types"
import { ArrowLeft, BellOff, CheckCheck, EllipsisVertical, EyeOff, Settings, SlidersHorizontal } from "lucide-react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"

import { Avatar, AvatarFallback, AvatarImage, PopoverContent, Switch } from "@workspace/ui/components"
import { Link } from "@/i18n/navigation"

type NotificationsMenuProps = {
  notifications: ViewerNotification[]
  unreadCount: number
  loading: boolean
  loadingMore: boolean
  error: boolean
  loadMoreError: boolean
  hasMore: boolean
  onReload: () => void
  onLoadMore: () => void
  onRead: (id: string) => void
  onReadAll: () => void
  onHide: (id: string) => void
  onMuteActor: (actorId: string) => void
  onSelect: () => void
}

export function ViewerNotificationsMenu(props: NotificationsMenuProps) {
  const t = useTranslations("viewer.notifications")
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settings, setSettings] = React.useState({ enabled: true, uploads: true, replies: true, memberships: true })
  const { hasMore, loadingMore, loadMoreError, onLoadMore } = props
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const root = scrollRef.current
    const target = loadMoreRef.current
    if (!root || !target || !hasMore || loadingMore || loadMoreError) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
    }, { root, rootMargin: "120px 0px" })
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadMoreError, loadingMore, onLoadMore])

  return <PopoverContent align="end" sideOffset={10} className="w-[480px] max-w-[calc(100vw-12px)] gap-0 overflow-hidden rounded-xl p-0">
    {settingsOpen ? <><header className="flex h-12 items-center gap-2 border-b px-3"><button type="button" aria-label={t("back")} onClick={() => setSettingsOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-muted"><ArrowLeft className="size-4"/></button><h2 className="font-semibold">{t("settings")}</h2></header><div className="space-y-1 p-3"><NotificationSetting label={t("enableAll")} checked={settings.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, enabled }))}/><div className={settings.enabled ? "" : "pointer-events-none opacity-40"}><NotificationSetting label={t("uploads")} checked={settings.uploads} onChange={(uploads) => setSettings((current) => ({ ...current, uploads }))}/><NotificationSetting label={t("replies")} checked={settings.replies} onChange={(replies) => setSettings((current) => ({ ...current, replies }))}/><NotificationSetting label={t("memberships")} checked={settings.memberships} onChange={(memberships) => setSettings((current) => ({ ...current, memberships }))}/></div></div></> : <>
      <header className="flex h-12 items-center justify-between border-b px-4"><h2 className="text-base font-semibold">{t("title")}</h2><div className="flex items-center gap-1"><button type="button" onClick={props.onReadAll} disabled={props.unreadCount === 0} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"><CheckCheck className="size-4"/>{t("readAll")}</button><button type="button" aria-label={t("settings")} onClick={() => setSettingsOpen(true)} className="rounded-full p-2 hover:bg-muted"><Settings className="size-5"/></button></div></header>
      <div ref={scrollRef} onScroll={(event) => { const element = event.currentTarget; if (props.hasMore && !props.loadingMore && element.scrollHeight - element.scrollTop - element.clientHeight < 120) props.onLoadMore() }} className="max-h-[min(560px,calc(100svh-88px))] overflow-y-auto py-2">
        {props.loading ? <div className="space-y-3 p-4" role="status" aria-label={t("loading")}>{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted"/>)}</div> : props.error ? <div className="grid place-items-center gap-3 px-6 py-14 text-center"><BellOff className="size-9 text-muted-foreground"/><p className="text-sm text-muted-foreground">{t("loadError")}</p><button type="button" onClick={props.onReload} className="rounded-full bg-muted px-4 py-2 text-sm font-semibold">{t("retry")}</button></div> : props.notifications.length === 0 ? <div className="grid place-items-center gap-2 px-6 py-14 text-center"><CheckCheck className="size-9 text-muted-foreground"/><p className="font-medium">{t("empty")}</p></div> : <NotificationGroups {...props}/>} 
        {!props.loading && props.notifications.length ? <div ref={loadMoreRef} className="px-4 py-3 text-center text-xs text-muted-foreground">{props.loadingMore ? <span className="inline-flex items-center gap-2"><span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"/>{t("loadingMore")}</span> : props.loadMoreError ? t("loadMoreError") : !props.hasMore ? t("allLoaded") : <span className="inline-block size-3.5 animate-pulse rounded-full bg-muted" aria-label={t("loadMoreReady")}/>}</div> : null}
      </div>
    </>}
  </PopoverContent>
}

function NotificationGroups(props: NotificationsMenuProps) {
  const t = useTranslations("viewer.notifications")
  const important = props.notifications.filter((item) => item.section === "important")
  const more = props.notifications.filter((item) => item.section === "more")
  return <>{important.length ? <NotificationSection title={t("important")} items={important} {...props}/> : null}{more.length ? <NotificationSection title={t("more")} items={more} bordered={important.length > 0} {...props}/> : null}</>
}

function NotificationSection({ title, items, bordered, ...props }: NotificationsMenuProps & { title: string; items: ViewerNotification[]; bordered?: boolean }) {
  return <section className={bordered ? "mt-2 border-t pt-2" : ""}><h3 className="px-4 py-2 text-sm font-semibold">{title}</h3>{items.map((item) => <NotificationItem key={item.id} item={item} {...props}/>)}</section>
}

function NotificationItem({ item, onRead, onHide, onMuteActor, onSelect }: NotificationsMenuProps & { item: ViewerNotification }) {
  const t = useTranslations("viewer.notifications")
  const locale = useLocale()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const age = relativeAge(item.createdAt, locale)
  return <article className={`relative grid grid-cols-[8px_42px_minmax(0,1fr)_86px_28px] items-start gap-2 px-2 py-3 hover:bg-muted/70 ${item.unread ? "bg-primary/5" : ""}`}><span className={`mt-4 size-1.5 rounded-full ${item.unread ? "bg-blue-500" : "bg-transparent"}`}/><Avatar className="size-10">{item.actorAvatarUrl ? <AvatarImage src={item.actorAvatarUrl} alt=""/> : null}<AvatarFallback className="bg-foreground text-[10px] font-bold text-background">{item.actorInitials}</AvatarFallback></Avatar><Link href={item.targetUrl} onClick={() => { onRead(item.id); onSelect() }} className="min-w-0"><span className="block text-sm leading-5">{t(`messages.${item.type}`, { actor: item.actorName, title: item.title })}</span><span className="mt-1 block text-xs text-muted-foreground">{age}</span></Link><Link href={item.targetUrl} onClick={() => { onRead(item.id); onSelect() }} className="relative aspect-video overflow-hidden rounded-lg bg-muted">{item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt="" fill unoptimized sizes="86px" className="object-cover"/> : null}</Link><button type="button" aria-label={t("itemOptions")} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="grid size-7 place-items-center rounded-full hover:bg-accent"><EllipsisVertical className="size-4"/></button>{menuOpen ? <div className="absolute top-10 right-3 z-10 w-[min(350px,calc(100%-68px))] rounded-xl bg-popover p-1 shadow-xl ring-1 ring-foreground/10"><button type="button" onClick={() => onHide(item.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"><EyeOff className="size-5"/>{t("hide")}</button><button type="button" onClick={() => onMuteActor(item.actorId)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"><BellOff className="size-5"/>{t("muteActor", { actor: item.actorName })}</button></div> : null}</article>
}

function NotificationSetting({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted"><SlidersHorizontal className="size-5 text-muted-foreground"/><span className="min-w-0 flex-1 text-sm font-medium">{label}</span><Switch checked={checked} onCheckedChange={onChange}/></label>
}

function relativeAge(value: string, locale: string) {
  const seconds = Math.round((Date.parse(value) - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second")
  const minutes = Math.round(seconds / 60)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour")
  return formatter.format(Math.round(hours / 24), "day")
}
