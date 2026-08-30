"use client"

import { LogOut } from "lucide-react"
import { useTranslations } from "next-intl"

import { authClient } from "@workspace/auth/client"
import { Button, buttonVariants } from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"

export function AuthActions() {
  const { data: session, isPending } = authClient.useSession()
  const auth = useTranslations("auth")

  if (isPending || !session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          className="hidden px-3 text-[13px] font-medium text-[var(--m-muted)] transition-colors hover:text-[var(--m-text)] sm:block"
          href="/login"
        >
          {auth("action.login")}
        </Link>
        <Link
          className={cn(
            buttonVariants({ size: "sm" }),
            "rounded-lg bg-[var(--m-brand)] px-4 text-white hover:bg-[var(--m-brand-hover)]"
          )}
          href="/register"
        >
          {auth("action.register")}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-36 truncate text-sm text-[var(--m-muted)] sm:block">
        {session.user.name || session.user.email}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="rounded-lg border-[var(--m-line)] bg-[var(--m-surface)] text-[var(--m-muted)]"
        aria-label={auth("action.logout")}
        onClick={() => void authClient.signOut()}
      >
        <LogOut className="size-3.5" />
      </Button>
    </div>
  )
}
