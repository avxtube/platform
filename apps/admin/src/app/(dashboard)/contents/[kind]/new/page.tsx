import { notFound } from "next/navigation"

import { ContentForm } from "@/components/content-form"
import { isContentKind } from "@/lib/content"

export default async function NewContentPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  if (!isContentKind(kind)) notFound()
  return <ContentForm kind={kind} />
}
