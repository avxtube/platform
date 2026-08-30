"use client"

/* eslint-disable @next/next/no-img-element */

import type { FollowingProfile } from "@workspace/core/types"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@workspace/ui/components"
import { BadgeCheck, Radio } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"

export function FollowingProfileCarousel({ profiles }: { profiles: FollowingProfile[] }) {
  const t = useTranslations("video.following")

  return (
    <section aria-labelledby="following-profiles">
      <h2 id="following-profiles" className="mb-5 text-xl font-bold">{t("profiles")}</h2>
      <Carousel opts={{ align: "start", slidesToScroll: "auto" }} className="mx-10 sm:mx-11">
        <CarouselContent className="-ml-3">
          {profiles.map((profile) => (
            <CarouselItem key={profile.id} className="basis-1/3 pl-3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 2xl:basis-[14.285%]">
              <Link href={`/channel/${profile.handle.replace(/^@/, "")}`} className="group block text-center">
                <span className={`relative mx-auto flex aspect-square w-full max-w-36 items-center justify-center overflow-hidden rounded-full bg-foreground text-xl font-black text-background ring-2 ring-transparent transition group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background ${profile.isLive ? "ring-red-500" : ""}`}>
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="size-full object-cover transition-transform group-hover:scale-105" /> : profile.initials}
                  {profile.isLive ? <Radio className="absolute right-1 bottom-1 size-6 rounded-full bg-background p-1 text-red-500" /> : null}
                </span>
                <span className="mt-3 flex items-center justify-center gap-1 text-sm font-semibold"><span className="line-clamp-1">{profile.name}</span>{profile.verified ? <BadgeCheck className="size-3.5 shrink-0 text-primary" /> : null}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{t(profile.type)}</span>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label={t("previousProfiles")} className="-left-10" />
        <CarouselNext aria-label={t("nextProfiles")} className="-right-10" />
      </Carousel>
    </section>
  )
}
