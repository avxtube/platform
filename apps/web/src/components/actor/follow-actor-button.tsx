"use client"

import { authClient } from "@workspace/auth/client"
import * as React from "react"
import { useTranslations } from "next-intl"
import { ShortGuestDialog } from "@/components/shorts/short-overlays"

export function FollowActorButton({ channelId, initialFollowing = false }: { channelId: string; initialFollowing?: boolean }) {
  const t = useTranslations("video")
  const { data: session } = authClient.useSession()
  const [following, setFollowing] = React.useState(initialFollowing)
  const [pending, setPending] = React.useState(false)
  const [guestPromptOpen, setGuestPromptOpen] = React.useState(false)

  React.useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/v1/following/${encodeURIComponent(channelId)}/status`)
      .then((response) => response.ok ? response.json() : null)
      .then((result: { following?: boolean } | null) => {
        if (result) setFollowing(Boolean(result.following))
      })
      .catch(() => undefined)
  }, [channelId, session?.user?.id])

  async function toggle() {
    if (!session?.user) {
      setGuestPromptOpen(true)
      return
    }
    setPending(true)
    try {
      const response = await fetch(`/api/v1/following/${encodeURIComponent(channelId)}`, {
        method: following ? "DELETE" : "PUT",
        headers: { "content-type": "application/json" },
        body: following ? undefined : JSON.stringify({ notifications: "personalized" }),
      })
      if (!response.ok) throw new Error(`Following API returned ${response.status}`)
      setFollowing(!following)
    } catch {
      return
    } finally {
      setPending(false)
    }
  }

  return <>
    <button
      type="button"
      disabled={pending}
      aria-pressed={following}
      onClick={() => void toggle()}
      className={following
        ? "rounded-full bg-muted px-5 py-2 text-sm font-semibold hover:bg-muted/80"
        : "rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90"}
    >
      {t(following ? "followingLabel" : "follow")}
    </button>
    {guestPromptOpen ? <ShortGuestDialog onClose={() => setGuestPromptOpen(false)} /> : null}
  </>
}
