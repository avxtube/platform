import { redirect } from "next/navigation"
import { defaultLocale } from "@workspace/i18n/config"
import { getShortsPage } from "@workspace/services/queries/video"

export const dynamic = "force-dynamic"

export default async function ShortsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const result = await getShortsPage(1, 5).catch(() => null)
  if (!result?.items[0]) redirect(locale === defaultLocale ? "/" : `/${locale}`)
  redirect(`${locale === defaultLocale ? "" : `/${locale}`}/shorts/${result.items[0].id}`)
}
