import { Users } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { ChannelManager } from "@/components/entity/channel-manager"
import { getAdminChannels } from "@/lib/admin-api"
import {
  channelKinds,
  channelStatuses,
  type AdminChannelKind,
  type AdminChannelStatus,
} from "@/lib/entity"

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[]
    kind?: string | string[]
    status?: string | string[]
    page?: string | string[]
  }>
}) {
  const [rawSearch, t] = await Promise.all([
    searchParams,
    getTranslations("admin.channels"),
  ])
  const query = first(rawSearch.q)?.trim() ?? ""
  const rawKind = first(rawSearch.kind)
  const kind = channelKinds.includes(rawKind as AdminChannelKind)
    ? (rawKind as AdminChannelKind)
    : undefined
  const rawStatus = first(rawSearch.status)
  const status =
    rawStatus === "all"
      ? "all"
      : channelStatuses.includes(rawStatus as AdminChannelStatus)
        ? (rawStatus as AdminChannelStatus)
        : "active"
  const page = Math.max(
    1,
    Number.parseInt(first(rawSearch.page) ?? "1", 10) || 1
  )
  const data = await getAdminChannels({ query, kind, status, page, limit: 50 })

  return (
    <div className="space-y-6">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Users className="size-4" />
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      </header>
      <ChannelManager data={data} query={query} kind={kind} status={status} />
    </div>
  )
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}
