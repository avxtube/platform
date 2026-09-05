import { notFound } from "next/navigation"

import { ContentForm } from "@/components/content-form"
import { getContent, getWorkerScraperSettings } from "@/lib/admin-api"
import { isContentKind } from "@/lib/content"

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>
}) {
  const { kind, id } = await params
  if (!isContentKind(kind)) notFound()
  const [content, workerSettings] = await Promise.all([
    getContent(id),
    kind === "video" ? getWorkerScraperSettings() : Promise.resolve(null),
  ])
  if (!content || content.kind !== kind) notFound()
  return (
    <ContentForm
      key={content._id}
      kind={kind}
      content={content}
      translationLocales={workerSettings?.missav.locales ?? []}
    />
  )
}
