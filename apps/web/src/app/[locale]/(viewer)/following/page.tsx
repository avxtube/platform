import { BadgeCheck, Radio, UsersRound } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { getFollowingProfiles } from "@workspace/services/queries/video"

export const dynamic = "force-dynamic"

export default async function FollowingPage() {
  const [result, t] = await Promise.all([
    getFollowingProfiles(0, 10).catch(() => ({ items: [], nextCursor: null, total: 0 })),
    getTranslations("viewer.navigation"),
  ])

  return <section><div className="mb-7 flex items-center gap-3"><UsersRound className="size-7" /><div><h1 className="text-2xl font-bold">{t("following")}</h1><p className="text-sm text-muted-foreground">{t("followingDescription", { count: result.total })}</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{result.items.map((profile) => <Link key={profile.id} href={profile.type === "actor" ? `/actors/${profile.handle}` : `/following?profile=${encodeURIComponent(profile.handle)}`} className="flex items-center gap-4 rounded-2xl border p-4 hover:bg-muted"><span className={`relative flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background ${profile.isLive ? "ring-2 ring-red-500 ring-offset-2 ring-offset-background" : ""}`}>{profile.initials}{profile.isLive ? <Radio className="absolute -right-1 -bottom-1 size-4 rounded-full bg-background p-0.5 text-red-500" /> : null}</span><div className="min-w-0"><p className="flex items-center gap-1 font-semibold">{profile.name}{profile.verified ? <BadgeCheck className="size-4" /> : null}</p><p className="text-xs text-muted-foreground">{t(profile.type)} • @{profile.handle}</p></div></Link>)}</div></section>
}
