"use client"

import { useState } from "react"
import { authClient } from "@workspace/auth/client"
import { Button, buttonVariants, Skeleton } from "@workspace/ui/components"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"


export function UserSession() {
  const router = useRouter()
  const t = useTranslations("auth")
  
  const { data: session, isPending } = authClient.useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)

    try {
      const { error } = await authClient.signOut()
      if (error) {
        setSignOutError(error.message ?? t("session.logoutError"))
        return
      }

      router.refresh()
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : t("session.logoutError")
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  if (isPending) {
    return (
      <div className="space-y-2" aria-label={t("session.loading")}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground">{t("session.notSignedIn")}</p>
        <Link href="/login" className={buttonVariants()}>
          {t("action.login")}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="font-medium">
          {session.user.name || t("session.signedInUser")}
        </p>
        <p className="text-xs text-muted-foreground">{session.user.email}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {session.user.id}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? t("session.loggingOut") : t("session.logout")}
      </Button>
      {signOutError && (
        <p className="text-xs text-destructive" role="alert">
          {signOutError}
        </p>
      )}
    </div>
  )
}
