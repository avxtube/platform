"use client"

import { authClient } from "@workspace/auth/client"
import type { Video, VideoInteraction } from "@workspace/core/types"
import {
  Bookmark,
  Check,
  Ellipsis,
  Flag,
  Link2,
  ListPlus,
  Share2,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"

import { ShortGuestDialog } from "@/components/shorts/short-overlays"

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose}>
            <X className="size-5" />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  )
}

export function VideoActions({ video, locale }: { video: Video; locale: string }) {
  const t = useTranslations("video")
  const { data: session } = authClient.useSession()
  const [interaction, setInteraction] = React.useState<VideoInteraction>({
    reaction: null,
    watchLater: false,
    saved: false,
    likeCount: video.likeCount ?? 0,
    dislikeCount: video.dislikeCount ?? 0,
  })
  const [interactionPending, setInteractionPending] = React.useState(false)
  const [guestPromptOpen, setGuestPromptOpen] = React.useState(false)
  const [dialog, setDialog] = React.useState<
    "share" | "save" | "report" | null
  >(null)
  const [copied, setCopied] = React.useState(false)
  const [startAt, setStartAt] = React.useState(false)
  const [playlists, setPlaylists] = React.useState<
    Array<{ name: string; selected: boolean }>
  >([])
  const [newPlaylist, setNewPlaylist] = React.useState("")
  const [reported, setReported] = React.useState(false)
  const number = React.useMemo(
    () => new Intl.NumberFormat(locale, { notation: "compact" }),
    [locale]
  )

  React.useEffect(() => {
    if (!session?.user) return
    const controller = new AbortController()
    fetch(`/api/v1/videos/${encodeURIComponent(video.id)}/interaction`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Interaction API returned ${response.status}`)
        return response.json() as Promise<{ interaction: VideoInteraction }>
      })
      .then((result) => setInteraction(result.interaction))
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          console.error("[video-interaction]", error)
      })
    return () => controller.abort()
  }, [session?.user?.id, video.id])

  async function updateInteraction(patch: Record<string, unknown>) {
    if (!session?.user) {
      setGuestPromptOpen(true)
      return
    }
    setInteractionPending(true)
    try {
      const response = await fetch(
        `/api/v1/videos/${encodeURIComponent(video.id)}/interaction`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify(patch),
        }
      )
      if (!response.ok)
        throw new Error(`Interaction API returned ${response.status}`)
      const result = (await response.json()) as {
        interaction: VideoInteraction
      }
      setInteraction(result.interaction)
    } catch (error) {
      console.error("[video-interaction]", error)
    } finally {
      setInteractionPending(false)
    }
  }

  async function copy(value: string) {
    await navigator.clipboard?.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.href}${startAt ? "?t=120" : ""}`
  const liked = interaction.reaction === "like"
  const disliked = interaction.reaction === "dislike"

  return (
    <>
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex overflow-hidden rounded-full bg-muted">
          <button
            type="button"
            disabled={interactionPending}
            aria-pressed={liked}
            onClick={() =>
              void updateInteraction({ reaction: liked ? null : "like" })
            }
            className="flex items-center gap-2 border-r px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-60"
          >
            <ThumbsUp className={`size-4 ${liked ? "fill-current" : ""}`} />
            {number.format(interaction.likeCount)}
          </button>
          <button
            type="button"
            disabled={interactionPending}
            aria-label={t("dislike")}
            aria-pressed={disliked}
            onClick={() =>
              void updateInteraction({ reaction: disliked ? null : "dislike" })
            }
            className="px-4 py-2 hover:bg-accent disabled:opacity-60"
          >
            <ThumbsDown
              className={`size-4 ${disliked ? "fill-current" : ""}`}
            />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDialog("share")}
          className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold hover:bg-accent"
        >
          <Share2 className="size-4" />
          {t("share")}
        </button>
        <button
          type="button"
          onClick={() =>
            session?.user ? setDialog("save") : setGuestPromptOpen(true)
          }
          className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold hover:bg-accent"
        >
          <Bookmark
            className={`size-4 ${interaction.saved || interaction.watchLater ? "fill-current" : ""}`}
          />
          {t("save")}
        </button>
        <button
          type="button"
          aria-label={t("moreOptions")}
          onClick={() => setDialog("report")}
          className="rounded-full bg-muted p-2.5 hover:bg-accent"
        >
          <Ellipsis className="size-4" />
        </button>
      </div>

      {dialog === "share" ? (
        <Modal title={t("shareVideo")} onClose={() => setDialog(null)}>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 rounded-lg border bg-muted px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => void copy(shareUrl)}
              className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={startAt}
              onChange={(event) => setStartAt(event.target.checked)}
            />
            {t("startAt")}
          </label>
          <button
            type="button"
            onClick={() =>
              void copy(
                `<iframe src="${shareUrl}" allowfullscreen></iframe>`
              )
            }
            className="mt-4 flex items-center gap-2 text-sm font-semibold"
          >
            <Link2 className="size-4" />
            {t("copyEmbed")}
          </button>
        </Modal>
      ) : null}

      {dialog === "save" ? (
        <Modal title={t("saveToPlaylist")} onClose={() => setDialog(null)}>
          <div className="space-y-2">
            <label className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
              <input
                type="checkbox"
                disabled={interactionPending}
                checked={interaction.watchLater}
                onChange={(event) =>
                  void updateInteraction({ watchLater: event.target.checked })
                }
              />
              {t("watchLater")}
            </label>
            <label className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
              <input
                type="checkbox"
                disabled={interactionPending}
                checked={interaction.saved}
                onChange={(event) =>
                  void updateInteraction({ saved: event.target.checked })
                }
              />
              {t("favorites")}
            </label>
            {playlists.map((playlist, index) => (
              <label
                key={playlist.name}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={playlist.selected}
                  onChange={() =>
                    setPlaylists((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, selected: !item.selected }
                          : item
                      )
                    )
                  }
                />
                {playlist.name}
              </label>
            ))}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (!newPlaylist.trim()) return
              setPlaylists((items) => [
                ...items,
                { name: newPlaylist.trim(), selected: true },
              ])
              setNewPlaylist("")
            }}
          >
            <input
              value={newPlaylist}
              onChange={(event) => setNewPlaylist(event.target.value)}
              placeholder={t("playlistName")}
              className="min-w-0 flex-1 rounded-lg border bg-background px-3"
            />
            <button
              className="rounded-full bg-muted p-2"
              aria-label={t("createPlaylist")}
            >
              <ListPlus className="size-5" />
            </button>
          </form>
        </Modal>
      ) : null}

      {dialog === "report" ? (
        <Modal title={t("report")} onClose={() => setDialog(null)}>
          {reported ? (
            <p className="flex items-center gap-2 text-sm text-green-600">
              <Check className="size-5" />
              {t("reportSent")}
            </p>
          ) : (
            <div className="space-y-2">
              {["sexual", "violent", "spam", "rights"].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setReported(true)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
                >
                  <Flag className="size-4" />
                  {t(`reportReason.${reason}`)}
                </button>
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {guestPromptOpen ? (
        <ShortGuestDialog onClose={() => setGuestPromptOpen(false)} />
      ) : null}
    </>
  )
}
