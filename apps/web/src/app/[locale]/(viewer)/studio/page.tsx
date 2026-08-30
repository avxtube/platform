/* eslint-disable @next/next/no-img-element */
import { BarChart3, DollarSign, Eye, Upload, UsersRound, Video } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { getStudioOverview } from "@workspace/services/queries/video"

export const dynamic = "force-dynamic"

export default async function StudioPage() {
  const [overview, t] = await Promise.all([
    getStudioOverview().catch(() => null),
    getTranslations("video"),
  ])
  if (!overview) return <div className="py-20 text-center text-muted-foreground">{t("studioUnavailable")}</div>

  const cards = [
    { label: t("studioViews"), value: Intl.NumberFormat(undefined, { notation: "compact" }).format(overview.totalViews), icon: Eye },
    { label: t("studioFollowers"), value: Intl.NumberFormat(undefined, { notation: "compact" }).format(overview.totalFollowers), icon: UsersRound },
    { label: t("studioVideos"), value: overview.totalVideos.toString(), icon: Video },
    { label: t("studioRevenue"), value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(overview.estimatedRevenue), icon: DollarSign },
  ]

  return (
    <section>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-primary">AVXTUBE Studio</p><h1 className="text-3xl font-bold">{t("studioDashboard")}</h1></div><button type="button" className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"><Upload className="size-4" />{t("uploadVideo")}</button></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="size-5 text-primary" /></div><p className="mt-4 text-3xl font-bold">{value}</p></article>)}</div>
      <div className="mt-8 rounded-2xl border"><div className="flex items-center gap-2 border-b p-5"><BarChart3 className="size-5" /><h2 className="font-bold">{t("recentContent")}</h2></div><div className="divide-y">{overview.recentVideos.map((video) => <div key={video.id} className="flex items-center gap-4 p-4"><Link href={`/watch/${video.id}`} className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-muted"><img src={video.thumbnailUrl} alt="" className="size-full object-cover" /></Link><div className="min-w-0 flex-1"><Link href={`/watch/${video.id}`} className="line-clamp-1 font-semibold hover:text-primary">{video.title}</Link><p className="text-xs text-muted-foreground">{t("views", { count: Intl.NumberFormat(undefined, { notation: "compact" }).format(video.viewCount) })}</p></div><span className="hidden text-xs text-green-600 sm:block">{t("publishedStatus")}</span></div>)}</div></div>
    </section>
  )
}
