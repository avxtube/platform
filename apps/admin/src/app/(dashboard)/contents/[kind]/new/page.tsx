import { notFound } from "next/navigation"

import { ContentForm } from "@/components/content-form"
import { getWorkerScraperSettings } from "@/lib/admin-api"
import { isContentKind } from "@/lib/content"

export default async function NewContentPage({
  params,
}: {
  params: Promise<{ kind: string }>
}) {
  const { kind } = await params
  if (!isContentKind(kind)) notFound()
  const workerSettings =
    kind === "video" ? await getWorkerScraperSettings() : null
  return (
    <ContentForm
      kind={kind}
      translationLocales={workerSettings?.missav.locales ?? []}
    />
  )
}
