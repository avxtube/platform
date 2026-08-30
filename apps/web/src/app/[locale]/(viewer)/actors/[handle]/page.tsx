import type { Locale } from "@workspace/i18n/config"
import { redirect } from "@/i18n/navigation"

export const dynamic = "force-dynamic"

export default async function ActorPage({ params }: { params: Promise<{ locale: Locale; handle: string }> }) {
  const { locale, handle } = await params
  redirect({ href: `/channel/${handle.replace(/^@/, "")}`, locale })
}
