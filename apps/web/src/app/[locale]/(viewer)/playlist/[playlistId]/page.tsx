import { notFound } from "next/navigation"
import { ListVideo, Play } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Image from "next/image"
import { getPlaylist } from "@workspace/services/queries/video"
import type { Locale } from "@workspace/i18n/config"
import { cache } from "react"

import { Link } from "@/i18n/navigation"
import { VideoGrid } from "@/components/video"
import { createPageMetadata } from "@/i18n/metadata"

export const dynamic = "force-dynamic"

const getPlaylistPageData = cache((playlistId: string) =>
  getPlaylist(playlistId)
)

type PlaylistPageProps = {
  params: Promise<{ locale: Locale; playlistId: string }>
}

export async function generateMetadata({ params }: PlaylistPageProps) {
  const { locale, playlistId } = await params
  const playlist = await getPlaylistPageData(playlistId).catch(() => null)
  if (!playlist) return {}
  return createPageMetadata({
    locale,
    pathname: `/playlist/${playlistId}`,
    title: playlist.title,
    description: playlist.description,
    image: playlist.items[0]?.thumbnailUrl,
  })
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const { locale, playlistId } = await params
  const [playlist, t, home] = await Promise.all([
    getPlaylistPageData(playlistId),
    getTranslations({ locale, namespace: "video" }),
    getTranslations({ locale, namespace: "video.home" }),
  ])
  if (!playlist) notFound()
  const first = playlist.items[0]
  const labels = {
    views: (count: string) => t("views", { count }),
    published: (date: string) => t("published", { date }),
    moreOptions: t("moreOptions"),
    verified: t("verified"),
  }
  return (
    <section className="py-2">
      <header className="mb-8 rounded-2xl bg-muted p-6 sm:flex sm:items-end sm:gap-6">
        <div className="relative grid aspect-video w-full max-w-sm place-items-center overflow-hidden rounded-xl bg-black sm:w-64">
          {first ? (
            <Image
              src={first.thumbnailUrl}
              alt=""
              fill
              priority
              unoptimized
              sizes="256px"
              className="object-cover"
            />
          ) : (
            <ListVideo className="size-10 text-white" />
          )}
        </div>
        <div className="mt-5 min-w-0 sm:mt-0">
          <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            {home("playlist")}
          </p>
          <h1 className="mt-2 text-3xl font-black">{playlist.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {playlist.owner} • {playlist.description}
          </p>
          {first ? (
            <Link
              href={`/watch/${first.id}?list=${encodeURIComponent(playlist.id)}&index=1`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background"
            >
              <Play className="size-4 fill-current" />
              {home("playAll")}
            </Link>
          ) : null}
        </div>
      </header>
      <VideoGrid
        videos={playlist.items}
        locale={locale}
        labels={labels}
        hideAvatar
        getVideoHref={(video, index) =>
          `/watch/${video.id}?list=${encodeURIComponent(playlist.id)}&index=${index + 1}`
        }
      />
    </section>
  )
}
