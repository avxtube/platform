import type { Locale } from "@workspace/i18n/config"
import { getChannel } from "@workspace/services/queries/video"
import { notFound } from "next/navigation"
import { cache } from "react"

import {
  ChannelContent,
  ChannelHeader,
  ChannelTabs,
} from "@/components/channel"
import {
  createPageMetadata,
  localizedPageUrl,
  serializeJsonLd,
} from "@/i18n/metadata"
import { parseChannelTab } from "@/lib/channel-tabs"
import { channelStructuredData } from "@/lib/structured-data"

export const dynamic = "force-dynamic"

type ChannelPageProps = {
  params: Promise<{ locale: Locale; handle: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}

const getChannelPageData = cache((handle: string) => getChannel(handle))

export async function generateMetadata({ params }: ChannelPageProps) {
  const { locale, handle } = await params
  const data = await getChannelPageData(handle).catch(() => null)
  if (!data) return {}

  return createPageMetadata({
    locale,
    pathname: `/channel/${handle.replace(/^@/, "")}`,
    title: data.channel.name,
    description: data.channel.description,
    image: data.channel.avatarUrl,
    openGraphType: data.channel.kind === "person" ? "profile" : "website",
  })
}

export default async function ChannelPage({
  params,
  searchParams,
}: ChannelPageProps) {
  const [{ locale, handle }, query] = await Promise.all([params, searchParams])
  const data = await getChannelPageData(handle).catch(() => null)
  if (!data) notFound()
  const tabValue = Array.isArray(query.tab) ? query.tab[0] : query.tab
  const activeTab = parseChannelTab(
    tabValue,
    data.channel.enabledTabs,
    data.channel.defaultTab
  )
  const pageUrl = localizedPageUrl(
    locale,
    `/channel/${handle.replace(/^@/, "")}`
  )

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(channelStructuredData(data.channel, pageUrl)),
        }}
      />
      <ChannelHeader channel={data.channel} locale={locale} />
      <ChannelTabs
        channel={data.channel}
        activeTab={activeTab}
        locale={locale}
      />
      <ChannelContent data={data} activeTab={activeTab} locale={locale} />
    </article>
  )
}
