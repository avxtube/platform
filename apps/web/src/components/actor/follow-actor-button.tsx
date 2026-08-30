"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

export function FollowActorButton({ initialFollowing = false }: { initialFollowing?: boolean }) {
  const t = useTranslations("video")
  const [following, setFollowing] = React.useState(initialFollowing)

  return (
    <button
      type="button"
      aria-pressed={following}
      onClick={() => setFollowing((value) => !value)}
      className={following
        ? "rounded-full bg-muted px-5 py-2 text-sm font-semibold hover:bg-muted/80"
        : "rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90"}
    >
      {t(following ? "following" : "follow")}
    </button>
  )
}
