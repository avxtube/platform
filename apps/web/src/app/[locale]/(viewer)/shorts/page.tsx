import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { defaultLocale } from "@workspace/i18n/config"
import { getShortsPage } from "@workspace/services/queries/video"

export const dynamic = "force-dynamic"

export default async function ShortsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const result = await getShortsPage(1, 5).catch(() => null)
  if (!result?.items[0]) {
    const t = await getTranslations({ locale, namespace: "video" })
    return (
      <main className="grid min-h-[60svh] place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-bold">{t("emptyTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("emptyShorts")}</p>
        </div>
      </main>
    )
  }
  redirect(`${locale === defaultLocale ? "" : `/${locale}`}/shorts/${result.items[0].id}`)
}
