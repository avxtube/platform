"use client"

import * as React from "react"
import type { Short } from "@workspace/core/types"
import { Heart, MessageCircle, Repeat2, Share2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { authClient } from "@workspace/auth/client"

import { ShortGuestDialog } from "./short-overlays"

function Action({ label, count, children, onClick, pressed }: { label: string; count?: string; children: React.ReactNode; onClick: () => void; pressed?: boolean }) {
  return <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick} className="flex flex-col items-center gap-1 text-xs font-medium text-white"><span className="grid size-11 place-items-center rounded-full bg-black/45 transition-colors hover:bg-black/65">{children}</span>{count ?? label}</button>
}

export function ShortActions({ short, locale, onComments, onShare, onRemix }: { short: Short; locale: string; onComments: () => void; onShare: () => void; onRemix: () => void }) {
  const t = useTranslations("video")
  const { data: session } = authClient.useSession()
  const [liked, setLiked] = React.useState(false)
  const [guestPromptOpen, setGuestPromptOpen] = React.useState(false)
  const number = React.useMemo(() => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }), [locale])
  const protectedAction = (action: () => void) => { if (!session?.user) setGuestPromptOpen(true); else action() }
  return <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-4">
    <Action label={t("like")} count={number.format(short.likeCount + (liked ? 1 : 0))} pressed={liked} onClick={() => protectedAction(() => setLiked((value) => !value))}><Heart className={`size-5 ${liked ? "fill-red-500 text-red-500" : ""}`} /></Action>
    <Action label={t("shorts.openComments")} count={number.format(short.commentCount)} onClick={onComments}><MessageCircle className="size-5" /></Action>
    <Action label={t("share")} count={number.format(short.shareCount)} onClick={onShare}><Share2 className="size-5" /></Action>
    <Action label={t("shorts.remix")} onClick={() => protectedAction(onRemix)}><Repeat2 className="size-5" /></Action>
    {guestPromptOpen ? <ShortGuestDialog onClose={() => setGuestPromptOpen(false)} /> : null}
  </div>
}
