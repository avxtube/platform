"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"

export type ViewerUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export function ViewerAvatar({ user, className }: { user?: ViewerUser | null; className?: string }) {
  const source = user?.name?.trim() || user?.email?.trim() || "A"
  const words = source.split(/\s+/).filter(Boolean)
  const initials = (words.length > 1
    ? `${Array.from(words[0] ?? "")[0] ?? ""}${Array.from(words.at(-1) ?? "")[0] ?? ""}`
    : Array.from(words[0] ?? source)[0] ?? "A").toLocaleUpperCase()

  return (
    <Avatar className={className}>
      {user?.image ? <AvatarImage src={user.image} alt={source} /> : null}
      <AvatarFallback className={cn("bg-foreground text-xs font-bold text-background")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
