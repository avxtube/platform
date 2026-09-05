/* eslint-disable @next/next/no-img-element */
import { BadgeCheck, UsersRound } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { Locale } from "@workspace/i18n/config"

import { FollowActorButton } from "@/components/actor/follow-actor-button"
import { createPageMetadata } from "@/i18n/metadata"
import { Link } from "@/i18n/navigation"
import { getActors } from "@workspace/services/queries/video"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "video" })
  return createPageMetadata({
    locale,
    pathname: "/actors",
    title: t("actorsTitle"),
    description: t("actorsDescription"),
  })
}

export default async function ActorsPage() {
  const [result, t] = await Promise.all([
    getActors().catch(() => ({ actors: [], total: 0 })),
    getTranslations("video"),
  ])

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <UsersRound className="size-6" />
        <div>
          <h1 className="text-2xl font-bold">{t("actorsTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("actorsDescription")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {result.actors.map((actor) => (
          <article
            key={actor.id}
            className="overflow-hidden rounded-2xl border bg-card"
          >
            <Link
              href={`/channel/${actor.handle.replace(/^@/, "")}`}
              className="block h-28 overflow-hidden bg-muted"
            >
              <img
                src={actor.coverUrl}
                alt=""
                className="size-full object-cover"
              />
            </Link>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/channel/${actor.handle.replace(/^@/, "")}`}
                    className="flex items-center gap-1 font-semibold hover:text-primary"
                  >
                    {actor.name}
                    {actor.verified ? <BadgeCheck className="size-4" /> : null}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {actor.handle} •{" "}
                    {t("followers", {
                      count: Intl.NumberFormat(undefined, {
                        notation: "compact",
                      }).format(actor.followerCount),
                    })}
                  </p>
                </div>
                <FollowActorButton
                  channelId={actor.id}
                  initialFollowing={actor.isFollowing}
                />
              </div>
              <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                {actor.bio}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
