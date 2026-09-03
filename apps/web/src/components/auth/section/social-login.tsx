"use client"

import React from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Button, Separator } from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"
import { authClient } from "@workspace/auth/client"
// import { FacebookIcon, GithubIcon, GoogleIcon } from "@workspace/ui/components";
import { safeRedirectUrl } from "@workspace/core/utils"
import { toast } from "sonner"

import { getPathname } from "@/i18n/navigation"

const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN

const DividerRender = () => {
  const t = useTranslations("auth")

  return (
    <div className="relative mt-6">
      <div className="absolute inset-0 flex items-center">
        <Separator className="w-full" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">
          {t("social.divider")}
        </span>
      </div>
    </div>
  )
}

interface FormSocialLoginProps {
  google?: boolean | ""
  github?: boolean | ""
  facebook?: boolean | ""
  side?: "top" | "bottom"
  onlySocial?: boolean
  signUp?: boolean
}

export function SocialLoginButtons({
  google,
  github,
  facebook,
  side = "top",
  onlySocial = false,
  signUp = false,
}: FormSocialLoginProps) {
  const [loading, setLoading] = React.useState<string | null>(null)
  const t = useTranslations("auth")
  const common = useTranslations("common")
  const locale = useLocale()
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams.get("callbackUrl")
  // Early return after hooks
  const hasAnyProvider = google || github || facebook

  const handleSocialLogin = async (
    provider: "github" | "google" | "facebook"
  ) => {
    setLoading(provider)
    try {
      const safeCallbackUrl = safeRedirectUrl(rawCallbackUrl, COOKIE_DOMAIN)
      const defaultCallbackUrl = getPathname({ locale, href: "/" })
      const errorPath = getPathname({ locale, href: "/error" })
      if (safeCallbackUrl) {
        const secure = window.location.protocol === "https:" ? "; secure" : ""
        document.cookie = `auth_callback_url=${encodeURIComponent(safeCallbackUrl)}${secure}; path=/; max-age=3600; SameSite=Lax`
      }
      const { data, error } = await authClient.signIn.social({
        provider,
        disableRedirect: true,
        callbackURL: safeCallbackUrl || defaultCallbackUrl,
        errorCallbackURL: `${errorPath}?callbackUrl=${encodeURIComponent(safeCallbackUrl || defaultCallbackUrl)}`,
        requestSignUp: signUp,
      })

      if (error) {
        toast.error(
          error.message ||
            t("social.signInError", { provider })
        )
        return
      }

      if (!data?.url) {
        toast.error(
          t("social.startError", { provider })
        )
        return
      }

      window.location.assign(data.url)
    } catch (err) {
      console.error(`${provider} login error:`, err)
      toast.error(
        t("social.connectionError", { provider })
      )
    } finally {
      setLoading(null)
    }
  }

  if (!hasAnyProvider) {
    return null
  }

  const providerCount = [google, github, facebook].filter(Boolean).length

  return (
    <>
      {side === "top" && !onlySocial && <DividerRender />}
      <div
        className={cn("gap-4", {
          grid: !onlySocial,
          "flex flex-col": onlySocial,
          "grid-cols-1": providerCount === 1 && !onlySocial,
          "grid-cols-2": providerCount === 2 && !onlySocial,
          "grid-cols-3": providerCount === 3 && !onlySocial,
          "mt-6": side === "top" && !onlySocial,
          "mb-6": side === "bottom" && !onlySocial,
        })}
      >
        {github && (
          <Button
            disabled={loading !== null}
            onClick={() => handleSocialLogin("github")}
            variant="outline"
            className="w-full rounded-full"
          >
            {/* <GithubIcon className="size-4" /> */}
            {loading === "github" ? common("submitting") : "GitHub"}
          </Button>
        )}
        {google && (
          <Button
            disabled={loading !== null}
            onClick={() => handleSocialLogin("google")}
            variant="outline"
            className="w-full rounded-full"
          >
            {/* <GoogleIcon className="size-4" /> */}
            {loading === "google" ? common("submitting") : "Google"}
          </Button>
        )}
        {facebook && (
          <Button
            disabled={loading !== null}
            onClick={() => handleSocialLogin("facebook")}
            variant="outline"
            className="w-full rounded-full"
          >
            {/* <FacebookIcon className="size-4" /> */}
            {loading === "facebook" ? common("submitting") : "Facebook"}
          </Button>
        )}
      </div>
      {side === "bottom" && !onlySocial && <DividerRender />}
    </>
  )
}
