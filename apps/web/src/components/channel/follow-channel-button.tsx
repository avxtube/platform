"use client"

import { authClient } from "@workspace/auth/client"
import * as React from "react"
import { Bell, BellOff, Check, ChevronDown, UserRoundX } from "lucide-react"
import { useTranslations } from "next-intl"
import { ShortGuestDialog } from "@/components/shorts/short-overlays"

type NotificationLevel = "all" | "personalized" | "none"

export function FollowChannelButton({ channelId, initialFollowing = false }: { channelId: string; initialFollowing?: boolean }) {
  const t = useTranslations("video.channel")
  const { data: session } = authClient.useSession()
  const [following, setFollowing] = React.useState(initialFollowing)
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationLevel>("personalized")
  const [pending, setPending] = React.useState(false)
  const [guestPromptOpen, setGuestPromptOpen] = React.useState(false)

  React.useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/v1/following/${encodeURIComponent(channelId)}/status`)
      .then((response) => response.ok ? response.json() : null)
      .then((result: { following?: boolean; notifications?: NotificationLevel } | null) => {
        if (!result) return
        setFollowing(Boolean(result.following))
        if (result.notifications) setNotifications(result.notifications)
      })
      .catch(() => undefined)
  }, [channelId, session?.user?.id])

  async function follow(level: NotificationLevel = notifications) {
    if (!session?.user) {
      setGuestPromptOpen(true)
      return
    }
    setPending(true)
    try {
      const response = await fetch(`/api/v1/following/${encodeURIComponent(channelId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notifications: level }),
      })
      if (!response.ok) throw new Error(`Following API returned ${response.status}`)
      setFollowing(true)
      setNotifications(level)
    } catch {
      return
    } finally {
      setPending(false)
    }
  }

  async function unfollow() {
    setPending(true)
    try {
      const response = await fetch(`/api/v1/following/${encodeURIComponent(channelId)}`, { method: "DELETE" })
      if (!response.ok) throw new Error(`Following API returned ${response.status}`)
      setFollowing(false)
      setOpen(false)
    } catch {
      return
    } finally {
      setPending(false)
    }
  }

  if (!following) {
    return <><button type="button" disabled={pending} onClick={() => void follow()} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60">{t("follow")}</button>{guestPromptOpen ? <ShortGuestDialog onClose={() => setGuestPromptOpen(false)} /> : null}</>
  }

  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-semibold hover:bg-muted/80"><Bell className="size-4" />{t("following")}<ChevronDown className="size-4" /></button>
      {open ? <div className="absolute top-full right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl">{(["all", "personalized", "none"] as const).map((level) => <button key={level} type="button" disabled={pending} onClick={() => { void follow(level); setOpen(false) }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">{level === "none" ? <BellOff className="size-5" /> : <Bell className="size-5" />}<span className="flex-1">{t(`notifications.${level}`)}</span>{notifications === level ? <Check className="size-4" /> : null}</button>)}<div className="my-1 border-t" /><button type="button" disabled={pending} onClick={() => void unfollow()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted"><UserRoundX className="size-5" />{t("unfollow")}</button></div> : null}
    </div>
  )
}
