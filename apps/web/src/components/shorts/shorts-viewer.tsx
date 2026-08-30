"use client"

import * as React from "react"
import type { ShortsPageResponse } from "@workspace/core/types"
import { ChevronDown, ChevronUp, LoaderCircle, RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { authClient } from "@workspace/auth/client"

import { Link, getPathname } from "@/i18n/navigation"
import { useShortOverlays } from "@/hooks/use-short-overlays"
import { useShortsFeed } from "@/hooks/use-shorts-feed"
import { useShortsNavigation } from "@/hooks/use-shorts-navigation"
import { ShortActions } from "./short-actions"
import { ShortMediaPlayer } from "./short-media-player"
import { ShortGuestDialog, ShortRemixDialog, ShortShareDialog, ShortsCommentsPanel } from "./short-overlays"

export function ShortsViewer({ initialPage, initialVideoId, locale }: { initialPage: ShortsPageResponse; initialVideoId: string; locale: string }) {
  const t = useTranslations("video")
  const { videos, hasNextPage, isLoading, error, loadNextPage, refreshFeed, retry } = useShortsFeed(initialPage)
  const initialIndex = Math.max(0, initialPage.items.findIndex((item) => item.id === initialVideoId))
  const { containerRef, currentIndex, goNext, goPrevious, handleScroll, handleWheel, handleKeyDown, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, isDragging, isRefreshing, pullDistance, pullReady } = useShortsNavigation(videos.length, refreshFeed, initialIndex)
  const { commentsOpen, shareVideo, remixVideo, closeComments, toggleComments, openShare, closeShare, openRemix, closeRemix } = useShortOverlays()
  const [muted, setMuted] = React.useState(true)
  const current = videos[currentIndex]

  React.useEffect(() => {
    if (!current) return
    const pathname = getPathname({ locale, href: `/shorts/${current.id}` })
    if (window.location.pathname !== pathname) window.history.replaceState(window.history.state, "", `${pathname}${window.location.search}${window.location.hash}`)
    if (currentIndex >= videos.length - 1 && hasNextPage) void loadNextPage()
  }, [current, currentIndex, hasNextPage, loadNextPage, locale, videos.length])

  if (!videos.length) return <div className="grid min-h-[60svh] place-items-center text-center"><div><p className="text-xl font-bold">{t("emptyTitle")}</p><p className="mt-2 text-muted-foreground">{t("emptyShorts")}</p><button type="button" onClick={() => void retry()} className="mt-5 rounded-full border px-5 py-2 text-sm font-semibold">{t("retry")}</button></div></div>

  return <section aria-label={t("shortsFeed")} className="relative mx-auto flex h-[calc(100svh-8rem-env(safe-area-inset-bottom))] min-h-0 max-w-[940px] justify-center overflow-hidden lg:h-[calc(100svh-6rem)] lg:min-h-[520px]">
    <div className="relative flex min-w-0 flex-1 justify-center">
      <div aria-live="polite" className={`pointer-events-none absolute top-2 z-30 flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-xs font-medium text-foreground shadow transition-opacity ${pullDistance > 4 || isRefreshing ? "opacity-100" : "opacity-0"}`} style={{ transform: `translateY(${Math.min(50, pullDistance / 2)}px)` }}><RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />{t(isRefreshing ? "shorts.refreshing" : pullReady ? "shorts.releaseRefresh" : "shorts.pullRefresh")}</div>
      <div ref={containerRef} tabIndex={0} onScroll={handleScroll} onWheel={handleWheel} onKeyDown={handleKeyDown} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} className={`h-full w-full touch-none snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isDragging ? "snap-none" : "scroll-smooth"}`}>
        {videos.map((short, index) => <article key={short.id} className="relative flex h-full snap-start snap-always items-center justify-center p-2 lg:p-0"><div className="relative h-full w-full max-w-[470px] overflow-hidden rounded-2xl bg-black text-white">
          <ShortMediaPlayer short={short} active={index === currentIndex && !commentsOpen} muted={muted} onMutedChange={setMuted} />
          <ShortActions short={short} locale={locale} onComments={toggleComments} onShare={() => openShare(short)} onRemix={() => openRemix(short)} />
          <div className="absolute right-16 bottom-5 left-5 z-10"><div className="mb-2 flex items-center gap-3"><Link href={`/actors/${short.channel.handle.replace(/^@/, "")}`} className="font-semibold hover:underline">{short.channel.name}</Link><FollowButton /></div><h1 className="line-clamp-2 font-semibold">{short.title}</h1><p className="mt-1 line-clamp-2 text-sm text-white/75">{short.description}</p></div>
        </div></article>)}
        {isLoading ? <div className="pointer-events-none absolute right-1/2 bottom-4 z-20 translate-x-1/2 rounded-full bg-black/65 p-2 text-white"><LoaderCircle className="size-5 animate-spin" /></div> : null}
      </div>
      {!commentsOpen ? <nav aria-label={t("shorts.navigation")} className="absolute top-1/2 right-0 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex"><button type="button" disabled={currentIndex === 0} onClick={goPrevious} aria-label={t("shorts.previous")} className="grid size-12 place-items-center rounded-full bg-muted shadow hover:bg-muted/80 disabled:opacity-30"><ChevronUp /></button><button type="button" disabled={currentIndex === videos.length - 1 && !hasNextPage} onClick={goNext} aria-label={t("shorts.next")} className="grid size-12 place-items-center rounded-full bg-muted shadow hover:bg-muted/80 disabled:opacity-30"><ChevronDown /></button></nav> : null}
      {error ? <button type="button" onClick={() => void retry()} className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground"><RefreshCw className="size-4" />{t("retry")}</button> : null}
    </div>
    {commentsOpen && current ? <ShortsCommentsPanel key={current.id} short={current} locale={locale} onClose={closeComments} /> : null}
    {shareVideo ? <ShortShareDialog short={shareVideo} onClose={closeShare} /> : null}
    {remixVideo ? <ShortRemixDialog short={remixVideo} onClose={closeRemix} /> : null}
  </section>
}

function FollowButton() {
  const t = useTranslations("video")
  const { data: session } = authClient.useSession()
  const [following, setFollowing] = React.useState(false)
  const [guestPromptOpen, setGuestPromptOpen] = React.useState(false)
  return <><button type="button" aria-pressed={following} onClick={() => session?.user ? setFollowing((value) => !value) : setGuestPromptOpen(true)} className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-white/85">{t(following ? "following" : "follow")}</button>{guestPromptOpen ? <ShortGuestDialog onClose={() => setGuestPromptOpen(false)} /> : null}</>
}
