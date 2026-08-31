import { notFound } from "next/navigation"

import { ContentForm } from "@/components/content-form"
import { getContent } from "@/lib/admin-api"
import { isContentKind } from "@/lib/content"

export default async function EditContentPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  if (!isContentKind(kind)) notFound()
  const content = await getContent(id)
  if (!content || content.kind !== kind) notFound()
  return <ContentForm kind={kind} content={content} />
}
