import React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components"

import { AuthFallback, EmailPasswordLogin, SocialLoginButtons } from "@/components/auth"
import type { LocalizedPageProps } from "@/i18n/metadata"
import { createPageMetadata } from "@/i18n/metadata"
import { getTranslations } from "next-intl/server"
import { DEFAULT_AUTH_SETTING } from "@workspace/core/config"
import { getSettingsByNames } from "@workspace/services/queries/setting"
import { Link } from "@/i18n/navigation"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function generateMetadata({ params }: LocalizedPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "auth" })
  return createPageMetadata({
    locale,
    pathname: "/login",
    title: t("login.description"),
    description: t("login.metadataDescription"),
  })
}

export default async function LoginPage() {
  const t = await getTranslations("auth")

  const { auth_setting = DEFAULT_AUTH_SETTING } = await getSettingsByNames(["auth_setting"]);

  if (!auth_setting.login.enabled || (!auth_setting.login.email_password && !auth_setting.login.social.google && !auth_setting.login.social.github)) {
    return (
      <Card className="lg:border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("login.closedTitle")}</CardTitle>
          <CardDescription>{t("login.closedDescription")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="lg:border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {t("login.title")}
        </CardTitle>
        <CardDescription>
          {t("login.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>

        {auth_setting.login.email_password && (
          <React.Suspense fallback={<AuthFallback />}>
            <EmailPasswordLogin captchaEnabled={auth_setting.captcha.enabled} />
          </React.Suspense>
        )}

        <React.Suspense>
          <SocialLoginButtons
            onlySocial={!auth_setting.login.email_password}
            google={auth_setting.login.social.google}
            github={auth_setting.login.social.github}
          />
        </React.Suspense>
      </CardContent>
      {auth_setting.register.enabled && (
        <CardFooter className="justify-center text-sm">
          {t("login.noAccount")}
          <Link href="/register" className="underline underline-offset-4 pl-2">
            {t("login.signUpHere")}
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}
