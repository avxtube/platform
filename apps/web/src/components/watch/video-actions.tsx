"use client"

import * as React from "react"
import type { Video } from "@workspace/core/types"
import { Bookmark, Check, Ellipsis, Flag, Link2, ListPlus, Share2, ThumbsDown, ThumbsUp, X } from "lucide-react"
import { useTranslations } from "next-intl"

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-background shadow-2xl"><header className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose}><X className="size-5" /></button></header><div className="p-5">{children}</div></section></div>
}

export function VideoActions({ video, locale }: { video: Video; locale: string }) {
  const t = useTranslations("video")
  const [liked, setLiked] = React.useState(false)
  const [disliked, setDisliked] = React.useState(false)
  const [dialog, setDialog] = React.useState<"share" | "save" | "report" | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [startAt, setStartAt] = React.useState(false)
  const [playlists, setPlaylists] = React.useState([{ name: t("watchLater"), selected: false }, { name: t("favorites"), selected: false }])
  const [newPlaylist, setNewPlaylist] = React.useState("")
  const [reported, setReported] = React.useState(false)

  async function copy(value: string) { await navigator.clipboard?.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500) }
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.href}${startAt ? "?t=120" : ""}`

  return <>
    <div className="flex flex-wrap gap-2">
      <div className="flex overflow-hidden rounded-full bg-muted"><button type="button" aria-pressed={liked} onClick={() => { setLiked((value) => !value); setDisliked(false) }} className="flex items-center gap-2 border-r px-4 py-2 text-sm font-semibold hover:bg-accent"><ThumbsUp className={`size-4 ${liked ? "fill-current" : ""}`} /> {Intl.NumberFormat(locale, { notation: "compact" }).format(video.viewCount / 12)}</button><button type="button" aria-label={t("dislike")} aria-pressed={disliked} onClick={() => { setDisliked((value) => !value); setLiked(false) }} className="px-4 py-2 hover:bg-accent"><ThumbsDown className={`size-4 ${disliked ? "fill-current" : ""}`} /></button></div>
      <button type="button" onClick={() => setDialog("share")} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold hover:bg-accent"><Share2 className="size-4" />{t("share")}</button>
      <button type="button" onClick={() => setDialog("save")} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold hover:bg-accent"><Bookmark className="size-4" />{t("save")}</button>
      <button type="button" aria-label={t("moreOptions")} onClick={() => setDialog("report")} className="rounded-full bg-muted p-2.5 hover:bg-accent"><Ellipsis className="size-4" /></button>
    </div>
    {dialog === "share" ? <Modal title={t("shareVideo")} onClose={() => setDialog(null)}><div className="flex gap-2"><input readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border bg-muted px-3 text-sm" /><button type="button" onClick={() => void copy(shareUrl)} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">{copied ? t("copied") : t("copy")}</button></div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={startAt} onChange={(event) => setStartAt(event.target.checked)} />{t("startAt")}</label><button type="button" onClick={() => void copy(`<iframe src="${shareUrl}" allowfullscreen></iframe>`)} className="mt-4 flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4" />{t("copyEmbed")}</button></Modal> : null}
    {dialog === "save" ? <Modal title={t("saveToPlaylist")} onClose={() => setDialog(null)}><div className="space-y-2">{playlists.map((playlist, index) => <label key={playlist.name} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"><input type="checkbox" checked={playlist.selected} onChange={() => setPlaylists((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, selected: !item.selected } : item))} />{playlist.name}</label>)}</div><form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!newPlaylist.trim()) return; setPlaylists((items) => [...items, { name: newPlaylist.trim(), selected: true }]); setNewPlaylist("") }}><input value={newPlaylist} onChange={(event) => setNewPlaylist(event.target.value)} placeholder={t("playlistName")} className="min-w-0 flex-1 rounded-lg border bg-background px-3" /><button className="rounded-full bg-muted p-2" aria-label={t("createPlaylist")}><ListPlus className="size-5" /></button></form></Modal> : null}
    {dialog === "report" ? <Modal title={t("report")} onClose={() => setDialog(null)}>{reported ? <p className="flex items-center gap-2 text-sm text-green-600"><Check className="size-5" />{t("reportSent")}</p> : <div className="space-y-2">{["sexual", "violent", "spam", "rights"].map((reason) => <button key={reason} type="button" onClick={() => setReported(true)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"><Flag className="size-4" />{t(`reportReason.${reason}`)}</button>)}</div>}</Modal> : null}
  </>
}
