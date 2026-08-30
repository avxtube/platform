import { getCurrentUser } from "@workspace/auth/server"
import type { Locale } from "@workspace/i18n/config"
import { getHistory } from "@workspace/services/queries/video"

import { HistoryPage } from "@/components/history/history-page"
import { ViewerSignInPrompt } from "@/components/viewer/viewer-sign-in-prompt"

export const dynamic = "force-dynamic"

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const user = await getCurrentUser()
  if (!user.userId) return <ViewerSignInPrompt kind="history" locale={locale} />
  const result = await getHistory().catch(() => ({ kind: "history" as const, videos: [], entries: [], total: 0 }))
  return <HistoryPage initialEntries={result.entries} locale={locale} />
}
