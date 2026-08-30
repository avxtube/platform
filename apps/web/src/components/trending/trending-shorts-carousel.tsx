"use client"

import type { Short } from "@workspace/core/types"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components"
import { EllipsisVertical, PlaySquare } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Image from "next/image"

import { Link } from "@/i18n/navigation"

export function TrendingShortsCarousel({ shorts }: { shorts: Short[] }) {
  const locale = useLocale()
  const t = useTranslations("video")
  const number = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })

  return (
    <section className="border-t pt-7" aria-labelledby="trending-shorts">
      <div className="mb-5 flex items-center gap-2">
        <PlaySquare className="size-6 fill-primary/15 text-primary" />
        <h2 id="trending-shorts" className="text-xl font-bold">Shorts</h2>
      </div>
      <Carousel opts={{ align: "start", slidesToScroll: "auto" }} className="mx-10 sm:mx-11">
        <CarouselContent className="-ml-4">
          {shorts.map((short) => (
            <CarouselItem key={short.id} className="basis-1/2 pl-4 sm:basis-1/3 lg:basis-1/4 2xl:basis-1/5">
              <article className="group min-w-0">
                <Link href={`/shorts/${short.id}`}>
                  <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
                    <Image src={short.thumbnailUrl} alt="" fill unoptimized sizes="(max-width: 640px) 50vw, 20vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                    <p className="absolute right-4 bottom-5 left-4 line-clamp-3 text-base leading-5 font-black text-white drop-shadow-lg">{short.title}</p>
                  </div>
                </Link>
                <div className="mt-2 flex gap-1">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold">{short.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{t("home.shortViews", { count: number.format(short.viewCount) })}</p>
                  </div>
                  <button type="button" aria-label={t("home.moreOptions")} className="h-8 text-muted-foreground">
                    <EllipsisVertical className="size-4" />
                  </button>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label={t("trending.previousShorts")} className="-left-10" />
        <CarouselNext aria-label={t("trending.nextShorts")} className="-right-10" />
      </Carousel>
    </section>
  )
}
