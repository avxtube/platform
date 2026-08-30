"use client"

import * as React from "react"
import type { Short, WatchComment } from "@workspace/core/types"
import { Check, ChevronDown, ChevronUp, Copy, Flag, Globe2, ListFilter, Mail, MessageCircle, Send, Share2, ThumbsDown, ThumbsUp, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { authClient } from "@workspace/auth/client"

import { useShortComments } from "@/hooks/use-short-comments"
import { Link } from "@/i18n/navigation"

export function ShortsCommentsPanel({ short, locale, onClose }: { short: Short; locale: string; onClose: () => void }) {
  const t = useTranslations("video")
  const { data: session } = authClient.useSession()
  const { items, hasMore, loading, error, loadMore, prepend } = useShortComments(short.id, [], "0")
  const [sort, setSort] = React.useState<"top" | "newest">("top")
  const [draft, setDraft] = React.useState("")
  const [reactions, setReactions] = React.useState<Record<string, "like" | "dislike">>({})
  const loadedRef = React.useRef(false)
  React.useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; void loadMore() } }, [loadMore])
  const comments = [...items].sort((a, b) => sort === "top" ? b.likeCount - a.likeCount : Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  const submit = () => { if (!draft.trim()) return; prepend({ id: `short-comment-${Date.now()}`, author: t("you"), initials: "ME", message: draft.trim(), likeCount: 0, publishedAt: new Date().toISOString() }); setDraft("") }
  return <aside aria-label={t("shorts.commentsPanel")} className="fixed inset-x-0 bottom-0 z-40 flex max-h-[78svh] flex-col rounded-t-2xl bg-background text-foreground shadow-2xl lg:absolute lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[420px] lg:rounded-none lg:rounded-r-2xl">
    <header className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold">{t("comments", { count: short.commentCount })}</h2><button type="button" onClick={() => setSort((value) => value === "top" ? "newest" : "top")} className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><ListFilter className="size-3.5" />{t(sort === "top" ? "sortTop" : "sortNewest")}</button></div><button type="button" aria-label={t("shorts.close")} onClick={onClose} className="rounded-full p-2 hover:bg-muted"><X className="size-5" /></button></header>
    <div className="flex-1 overflow-y-auto p-5">
      {short.commentPolicy === "disabled" ? <div className="grid place-items-center gap-2 py-16 text-center text-muted-foreground"><MessageCircle className="size-10" /><p className="font-medium">{t("shorts.commentsDisabled")}</p></div> : <>
        {short.commentPolicy === "review" ? <p className="mb-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">{t("shorts.commentsReview")}</p> : null}
        {session?.user ? <div className="mb-6 flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit() }} placeholder={t("addComment")} className="min-w-0 flex-1 border-b bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"/><button type="button" disabled={!draft.trim()} onClick={submit} aria-label={t("comment")} className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-40"><Send className="size-4" /></button></div> : <Link href="/login" className="mb-6 block rounded-xl bg-muted p-3 text-center text-sm font-semibold hover:bg-muted/80">{t("shorts.signInToComment")}</Link>}
        <div className="space-y-6">{comments.map((comment) => <ShortComment key={comment.id} comment={comment} locale={locale} reaction={reactions[comment.id]} onReaction={(reaction) => setReactions((current) => ({ ...current, [comment.id]: current[comment.id] === reaction ? undefined! : reaction }))} />)}</div>
        {loading && comments.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t("loadingMore")}</p> : null}
        {hasMore ? <button type="button" disabled={loading} onClick={() => void loadMore()} className="mt-6 w-full rounded-full border py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">{t(loading ? "loadingMore" : error ? "retry" : "loadMoreComments")}</button> : comments.length ? <p className="mt-6 text-center text-xs text-muted-foreground">{t("allCommentsLoaded")}</p> : null}
      </>}
    </div>
  </aside>
}

function ShortComment({ comment, locale, reaction, onReaction }: { comment: WatchComment; locale: string; reaction?: "like" | "dislike"; onReaction: (value: "like" | "dislike") => void }) {
  const t = useTranslations("video")
  const [repliesOpen, setRepliesOpen] = React.useState(false)
  const [replyOpen, setReplyOpen] = React.useState(false)
  const [replyDraft, setReplyDraft] = React.useState("")
  const [replies, setReplies] = React.useState(comment.replies ?? [])
  const [reported, setReported] = React.useState(false)
  const addReply = () => { if (!replyDraft.trim()) return; setReplies((current) => [...current, { id: `short-reply-${Date.now()}`, author: t("you"), initials: "ME", message: replyDraft.trim(), likeCount: 0, publishedAt: new Date().toISOString() }]); setReplyDraft(""); setReplyOpen(false); setRepliesOpen(true) }
  return <article className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold">{comment.initials}</span><div className="min-w-0 flex-1"><p className="text-xs"><strong>{comment.author}</strong> <span className="text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(comment.publishedAt))}</span></p><p className="mt-1 text-sm leading-5">{comment.message}</p><div className="mt-1 flex items-center gap-1"><button type="button" onClick={() => onReaction("like")} className="flex items-center gap-1 rounded-full p-2 text-xs hover:bg-muted"><ThumbsUp className={`size-3.5 ${reaction === "like" ? "fill-current text-primary" : ""}`} />{comment.likeCount + (reaction === "like" ? 1 : 0)}</button><button type="button" onClick={() => onReaction("dislike")} className="rounded-full p-2 hover:bg-muted"><ThumbsDown className={`size-3.5 ${reaction === "dislike" ? "fill-current" : ""}`} /></button><button type="button" onClick={() => setReplyOpen((value) => !value)} className="rounded-full px-2 py-1 text-xs font-semibold hover:bg-muted">{t("reply")}</button><button type="button" aria-label={t("report")} title={reported ? t("reportSent") : t("report")} onClick={() => setReported(true)} className={`rounded-full p-2 hover:bg-muted ${reported ? "text-primary" : ""}`}><Flag className="size-3.5" /></button></div>
  {replyOpen ? <div className="my-2 flex gap-2"><input autoFocus value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addReply() }} placeholder={t("replyTo", { name: comment.author })} className="min-w-0 flex-1 border-b bg-transparent px-1 text-xs outline-none"/><button type="button" disabled={!replyDraft.trim()} onClick={addReply} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40">{t("reply")}</button></div> : null}
  {replies.length ? <><button type="button" onClick={() => setRepliesOpen((value) => !value)} className="flex items-center gap-1 text-xs font-semibold text-primary">{repliesOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}{t("replies", { count: replies.length })}</button>{repliesOpen ? <div className="mt-3 space-y-3">{replies.map((reply) => <p key={reply.id} className="text-sm"><strong className="mr-2 text-xs">{reply.author}</strong>{reply.message}</p>)}</div> : null}</> : null}</div></article>
}

export function ShortShareDialog({ short, onClose }: { short: Short; onClose: () => void }) {
  const t = useTranslations("video")
  const [copied, setCopied] = React.useState(false)
  const url = typeof window === "undefined" ? "" : window.location.href
  const encoded = encodeURIComponent(url)
  const shareTargets = [
    { label: "Facebook", icon: Globe2, href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { label: t("shorts.messages"), icon: MessageCircle, href: `sms:?body=${encoded}` },
    { label: "WhatsApp", icon: Send, href: `https://wa.me/?text=${encoded}` },
    { label: "X", icon: Share2, href: `https://twitter.com/intent/tweet?url=${encoded}` },
    { label: t("shorts.email"), icon: Mail, href: `mailto:?subject=${encodeURIComponent(short.title)}&body=${encoded}` },
  ]
  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
  return <Modal title={t("shareVideo")} onClose={onClose}><div className="grid grid-cols-5 gap-3">{shareTargets.map(({ label, icon: Icon, href }) => <a key={label} href={href} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 text-center text-xs"><span className="grid size-11 place-items-center rounded-full bg-muted"><Icon className="size-5" /></span>{label}</a>)}</div><div className="mt-6 flex gap-2 rounded-xl bg-muted p-2"><input readOnly value={url} className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none"/><button type="button" onClick={() => void copy()} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{t(copied ? "copied" : "copy")}</button></div></Modal>
}

export function ShortRemixDialog({ short, onClose }: { short: Short; onClose: () => void }) {
  const t = useTranslations("video")
  return <Modal title={t("shorts.remixTitle")} onClose={onClose}><p className="text-sm text-muted-foreground">{t("shorts.remixDescription", { title: short.title })}</p><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" className="rounded-xl border p-4 text-sm font-semibold hover:bg-muted">{t("shorts.useSound")}</button><button type="button" className="rounded-xl border p-4 text-sm font-semibold hover:bg-muted">{t("shorts.cutVideo")}</button></div></Modal>
}

export function ShortGuestDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("video")
  return <Modal title={t("shorts.signInRequired")} onClose={onClose}><p className="text-sm text-muted-foreground">{t("shorts.signInDescription")}</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-muted">{t("cancel")}</button><Link href="/login" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{t("shorts.signIn")}</Link></div></Modal>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const t = useTranslations("video")
  React.useEffect(() => { const overflow = document.body.style.overflow; const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }; document.body.style.overflow = "hidden"; document.addEventListener("keydown", close); return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", close) } }, [onClose])
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><section role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-background p-5 text-foreground shadow-2xl"><header className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button type="button" aria-label={t("shorts.close")} onClick={onClose} className="rounded-full p-2 hover:bg-muted"><X className="size-5" /></button></header>{children}</section></div>
}
