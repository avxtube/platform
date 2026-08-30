import type { Locale } from "@workspace/i18n/config"
import { getChannel } from "@workspace/services/queries/video"
import { notFound } from "next/navigation"

import { ChannelContent, ChannelHeader, ChannelTabs } from "@/components/channel"
import { parseChannelTab } from "@/lib/channel-tabs"

export const dynamic = "force-dynamic"

type ChannelPageProps = {
  params: Promise<{ locale: Locale; handle: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}

export default async function ChannelPage({ params, searchParams }: ChannelPageProps) {
  const [{ locale, handle }, query] = await Promise.all([params, searchParams])
  const data = await getChannel(handle).catch(() => null)
  if (!data) notFound()
  const tabValue = Array.isArray(query.tab) ? query.tab[0] : query.tab
  const activeTab = parseChannelTab(tabValue, data.channel.enabledTabs, data.channel.defaultTab)

  return (
    <article>
      <ChannelHeader channel={data.channel} locale={locale} />
      <ChannelTabs channel={data.channel} activeTab={activeTab} locale={locale} />
      <ChannelContent data={data} activeTab={activeTab} locale={locale} />
    </article>
  )
}
