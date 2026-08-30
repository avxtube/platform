/* eslint-disable @next/next/no-img-element */
import type { Locale } from "@workspace/i18n/config"
import { BadgeCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { FollowActorButton } from "@/components/actor/follow-actor-button"
import { VideoGrid } from "@/components/video"
import { getActor } from "@workspace/services/queries/video"

export const dynamic = "force-dynamic"

export default async function ActorPage({ params }: { params: Promise<{ locale: Locale; handle: string }> }) {
  const { locale, handle } = await params
  const [result, t] = await Promise.all([getActor(handle).catch(() => null), getTranslations({ locale, namespace: "video" })])
  if (!result) notFound()
  const { actor, videos } = result
  return (
    <article>
      <div className="relative h-40 overflow-hidden rounded-2xl bg-muted sm:h-56"><img src={actor.coverUrl} alt="" className="size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" /></div>
      <div className="flex flex-col gap-5 px-2 py-6 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-2 text-3xl font-bold">{actor.name}{actor.verified ? <BadgeCheck className="size-6" /> : null}</h1><p className="mt-1 text-sm text-muted-foreground">{actor.handle} • {t("followers", { count: Intl.NumberFormat(locale, { notation: "compact" }).format(actor.followerCount) })} • {t("videoCount", { count: actor.videoCount })}</p><p className="mt-3 max-w-2xl text-sm">{actor.bio}</p></div><FollowActorButton initialFollowing={actor.isFollowing} /></div>
      <h2 className="mb-4 text-xl font-bold">{t("latestVideos")}</h2>
      <VideoGrid videos={videos} locale={locale} labels={{ views: (count) => t("views", { count }), published: (date) => t("published", { date }), moreOptions: t("moreOptions"), verified: t("verified") }} />
    </article>
  )
}
