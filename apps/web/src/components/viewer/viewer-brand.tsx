"use client"

import { Play } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"

export function ViewerBrand() {
  const t = useTranslations("viewer")

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2"
      aria-label={t("brandHome")}
    >
      <span className="flex h-7 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/25">
        <Play className="ml-0.5 size-3.5 fill-current" />
      </span>
      <span className="text-lg font-black tracking-[-0.055em]">AVXTUBE</span>
    </Link>
  )
}
