import type { CollectionKind, Video } from "@workspace/core/types"
import type { Locale } from "@workspace/i18n/config"
import type { LucideIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { VideoGrid } from "@/components/video"
import { ViewerSignInPrompt } from "@/components/viewer/viewer-sign-in-prompt"
import { getCurrentUser } from "@workspace/auth/server"
import { getCollection } from "@workspace/services/queries/video"
import { headers } from "next/headers"

export async function UserCollectionPage({ kind, icon, locale }: { kind: CollectionKind; icon: LucideIcon; locale: Locale }) {
  const user = await getCurrentUser()
  if (!user.userId) return <ViewerSignInPrompt kind={kind} locale={locale} />
  const requestHeaders = await headers()
  const cookie = requestHeaders.get("cookie")
  const result = await getCollection(kind, cookie ? { cookie } : undefined).catch(() => ({ kind, videos: [], total: 0 }))
  return <CollectionPage kind={kind} icon={icon} videos={result.videos} locale={locale} />
}

export async function CollectionPage({ kind, icon: Icon, videos, locale }: { kind: CollectionKind; icon: LucideIcon; videos: Video[]; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "video.collections" })
  const labels = { views: (count: string) => t("views", { count }), published: (date: string) => t("published", { date }), moreOptions: t("moreOptions"), verified: t("verified") }
  return <div className="pb-8"><header className="flex items-start gap-4 py-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" /></span><div><h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">{t(`${kind}.title`)}</h1><p className="mt-2 text-sm text-muted-foreground">{t(`${kind}.description`)}</p></div></header><section className="mt-8">{videos.length ? <VideoGrid videos={videos} locale={locale} labels={labels} /> : <p className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">{t("empty")}</p>}</section></div>
}
