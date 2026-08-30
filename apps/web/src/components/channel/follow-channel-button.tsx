"use client"

import * as React from "react"
import { Bell, BellOff, Check, ChevronDown, UserRoundX } from "lucide-react"
import { useTranslations } from "next-intl"

type NotificationLevel = "all" | "personalized" | "none"

export function FollowChannelButton({ initialFollowing = false }: { initialFollowing?: boolean }) {
  const t = useTranslations("video.channel")
  const [following, setFollowing] = React.useState(initialFollowing)
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationLevel>("personalized")

  if (!following) {
    return <button type="button" onClick={() => setFollowing(true)} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90">{t("follow")}</button>
  }

  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-semibold hover:bg-muted/80"><Bell className="size-4" />{t("following")}<ChevronDown className="size-4" /></button>
      {open ? <div className="absolute top-full right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl">{(["all", "personalized", "none"] as const).map((level) => <button key={level} type="button" onClick={() => { setNotifications(level); setOpen(false) }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">{level === "none" ? <BellOff className="size-5" /> : <Bell className="size-5" />}<span className="flex-1">{t(`notifications.${level}`)}</span>{notifications === level ? <Check className="size-4" /> : null}</button>)}<div className="my-1 border-t" /><button type="button" onClick={() => { setFollowing(false); setOpen(false) }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"><UserRoundX className="size-5" />{t("unfollow")}</button></div> : null}
    </div>
  )
}
