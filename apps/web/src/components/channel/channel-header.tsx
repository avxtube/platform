/* eslint-disable @next/next/no-img-element */
import type { Channel } from "@workspace/core/types"
import { BadgeCheck, CircleDollarSign } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { ChannelInfoDialog } from "./channel-info-dialog"
import { FollowChannelButton } from "./follow-channel-button"

export async function ChannelHeader({ channel, locale }: { channel: Channel; locale: string }) {
  const t = await getTranslations({ locale, namespace: "video.channel" })
  const number = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })
  const showBanner = channel.layout === "banner" && channel.bannerUrl

  return (
    <header className={showBanner ? "" : "mx-auto max-w-5xl pt-6"}>
      {showBanner ? <div className="relative h-36 overflow-hidden rounded-2xl bg-muted sm:h-52"><img src={channel.bannerUrl!} alt="" className="size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" /></div> : null}
      <div className={`${showBanner ? "mt-5" : ""} flex flex-col gap-5 sm:flex-row sm:items-center`}>
        <div className={`grid shrink-0 place-items-center overflow-hidden rounded-full border-4 border-background bg-foreground font-black text-background ${showBanner ? "size-24 text-xl sm:size-32" : "size-32 text-2xl sm:size-40"}`}>
          {channel.avatarUrl ? <img src={channel.avatarUrl} alt="" className="size-full object-cover" /> : channel.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{channel.name}</h1>{channel.verified ? <BadgeCheck className="size-5 text-primary" aria-label={t("verified")} /> : null}</div>
          <p className="mt-2 text-sm text-muted-foreground">@{channel.handle} • {t("subscribers", { count: number.format(channel.subscriberCount) })} • {t("videoCount", { count: channel.videoCount })}</p>
          <div className="flex items-end gap-2"><p className="mt-3 line-clamp-1 max-w-3xl text-sm leading-6 text-muted-foreground">{channel.description}</p><ChannelInfoDialog channel={channel} /></div>
          {channel.links[0] ? <a href={channel.links[0].url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">{channel.links[0].label}</a> : null}
          <div className="mt-4 flex flex-wrap gap-2"><FollowChannelButton initialFollowing={channel.isFollowing} />{channel.membershipEnabled ? <button type="button" className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-semibold hover:bg-muted/80"><CircleDollarSign className="size-4" />{t("membership")}</button> : null}</div>
        </div>
      </div>
    </header>
  )
}
