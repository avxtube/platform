"use client"

import * as React from "react"
import { authClient } from "@workspace/auth/client"
import type { WatchComment } from "@workspace/core/types"
import { ChevronDown, ChevronUp, Flag, ListFilter, LoaderCircle, Pin, Send, ThumbsDown, ThumbsUp } from "lucide-react"
import { useTranslations } from "next-intl"
import { useWatchComments } from "@/hooks/use-watch-comments"
import { ShortGuestDialog } from "@/components/shorts/short-overlays"

export function WatchComments({ videoId, initialComments, initialNextCursor, initialTotal, locale }: { videoId: string; initialComments: WatchComment[]; initialNextCursor: string | null; initialTotal: number; locale: string }) {
  const t = useTranslations("video")
  const { data: session } = authClient.useSession()
  const commentsPage = useWatchComments(videoId, initialComments, initialNextCursor)
  const comments = commentsPage.items
  const [draft, setDraft] = React.useState("")
  const [sort, setSort] = React.useState<"top" | "newest">("top")
  const [replyTo, setReplyTo] = React.useState<string | null>(null)
  const [replyDraft, setReplyDraft] = React.useState("")
  const [openReplies, setOpenReplies] = React.useState<Set<string>>(new Set(initialComments.map((item) => item.id)))
  const [reactions, setReactions] = React.useState<Record<string, "like" | "dislike">>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(false)
  const [guestPromptOpen, setGuestPromptOpen] = React.useState(false)
  const [total, setTotal] = React.useState(initialTotal)

  const visible = [...comments].sort((left, right) => sort === "top" ? right.likeCount - left.likeCount : Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
  async function submitComment(message: string, parentId?: string) {
    if (!session?.user) {
      setGuestPromptOpen(true)
      return null
    }
    setSubmitting(true)
    setSubmitError(false)
    try {
      const response = await fetch(`/api/v1/videos/${encodeURIComponent(videoId)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, ...(parentId ? { parentId } : {}) }),
      })
      if (!response.ok) throw new Error(`Comments API returned ${response.status}`)
      const result = await response.json() as { comment: WatchComment }
      return result.comment
    } catch {
      setSubmitError(true)
      return null
    } finally {
      setSubmitting(false)
    }
  }
  async function addComment() {
    const message = draft.trim()
    if (!message) return
    const comment = await submitComment(message)
    if (!comment) return
    commentsPage.prepend(comment)
    setTotal((value) => value + 1)
    setDraft("")
  }
  async function addReply(parentId: string) {
    const message = replyDraft.trim()
    if (!message) return
    const reply = await submitComment(message, parentId)
    if (!reply) return
    commentsPage.updateItems((items) => items.map((item) => item.id === parentId ? { ...item, replies: [...(item.replies ?? []), reply] } : item))
    setReplyDraft("")
    setReplyTo(null)
  }

  return <section className="mt-8">
    <div className="flex items-center gap-4"><h2 className="text-lg font-bold">{t("comments", { count: total })}</h2><button type="button" onClick={() => setSort((value) => value === "top" ? "newest" : "top")} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold hover:bg-muted"><ListFilter className="size-4" />{t(sort === "top" ? "sortTop" : "sortNewest")}</button></div>
    <div className="mt-5 flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">ME</span><div className="flex-1"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t("addComment")} rows={1} className="w-full resize-none border-b bg-transparent px-1 py-2 text-sm outline-none focus:border-primary" /><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setDraft("")} className="rounded-full px-4 py-2 text-sm hover:bg-muted">{t("cancel")}</button><button type="button" disabled={!draft.trim() || submitting} onClick={() => void addComment()} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"><Send className="size-4" />{t("comment")}</button></div>{submitError ? <p className="mt-2 text-xs text-destructive">{t("commentFailed")}</p> : null}</div></div>
      <div className="mt-7 space-y-7">{visible.map((comment) => <article key={comment.id} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{comment.initials}</span><div className="min-w-0 flex-1">{comment.pinned ? <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><Pin className="size-3" />{t("pinned")}</p> : null}<p className="text-xs"><strong>{comment.author}</strong> <span className="text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(comment.publishedAt))}</span></p><p className="mt-1 text-sm leading-6">{comment.message}</p><div className="mt-1 flex items-center gap-1 text-xs"><button type="button" onClick={() => setReactions((items) => ({ ...items, [comment.id]: items[comment.id] === "like" ? undefined! : "like" }))} className="flex items-center gap-1 rounded-full px-2 py-1.5 hover:bg-muted"><ThumbsUp className={`size-3.5 ${reactions[comment.id] === "like" ? "fill-current text-primary" : ""}`} />{comment.likeCount + (reactions[comment.id] === "like" ? 1 : 0)}</button><button type="button" onClick={() => setReactions((items) => ({ ...items, [comment.id]: items[comment.id] === "dislike" ? undefined! : "dislike" }))} className="rounded-full p-2 hover:bg-muted"><ThumbsDown className={`size-3.5 ${reactions[comment.id] === "dislike" ? "fill-current" : ""}`} /></button><button type="button" onClick={() => setReplyTo(comment.id)} className="rounded-full px-3 py-1.5 font-semibold hover:bg-muted">{t("reply")}</button><button type="button" title={t("report")} className="rounded-full p-2 hover:bg-muted"><Flag className="size-3.5" /></button></div>
      {replyTo === comment.id ? <div className="mt-2 flex gap-2"><input autoFocus value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder={t("replyTo", { name: comment.author })} className="min-w-0 flex-1 border-b bg-transparent px-2 text-sm outline-none" /><button type="button" disabled={submitting} onClick={() => void addReply(comment.id)} className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">{t("reply")}</button></div> : null}
      {(comment.replies?.length ?? 0) > 0 ? <div className="mt-2"><button type="button" onClick={() => setOpenReplies((current) => { const next = new Set(current); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next })} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10">{openReplies.has(comment.id) ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}{t("replies", { count: comment.replies!.length })}</button>{openReplies.has(comment.id) ? <div className="mt-2 space-y-4">{comment.replies!.map((reply) => <div key={reply.id} className="flex gap-2"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">{reply.initials}</span><div><p className="text-xs font-semibold">{reply.author}</p><p className="text-sm">{reply.message}</p></div></div>)}</div> : null}</div> : null}</div></article>)}</div>
    {commentsPage.loading ? <div role="status" className="mt-7 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{t("loadingMore")}</div> : null}
    {commentsPage.hasMore && !commentsPage.loading ? <button type="button" onClick={() => void commentsPage.loadMore()} className="mt-7 rounded-full border px-5 py-2.5 text-sm font-semibold hover:bg-muted">{t(commentsPage.error ? "retry" : "loadMoreComments")}</button> : null}
    {!commentsPage.hasMore ? <p className="mt-7 text-sm text-muted-foreground">{t("allCommentsLoaded")}</p> : null}
    {guestPromptOpen ? <ShortGuestDialog onClose={() => setGuestPromptOpen(false)} /> : null}
  </section>
}
