import type { Locale } from "@workspace/i18n/config"
import { Library } from "lucide-react"
import { UserCollectionPage } from "@/components/collection/collection-page"
export const dynamic = "force-dynamic"
export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) { const { locale } = await params; return <UserCollectionPage kind="library" icon={Library} locale={locale} /> }
