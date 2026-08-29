import React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components"

import { AuthFallback, EmailPasswordLogin } from "@/components/auth"
import { SocialLoginButtons } from "@/components/auth/section/social-login"
import type { LocalizedPageProps } from "@/i18n/metadata"
import { createPageMetadata } from "@/i18n/metadata"
import { getTranslations } from "next-intl/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function generateMetadata({ params }: LocalizedPageProps) {
  const { locale } = await params
  return createPageMetadata({
    locale,
    pathname: "/login",
    title: "Login to your account",
    description: "Log in to your VdoHide account.",
  })
}

export default async function LoginPage() {

  const t = await getTranslations();

  return (
    <Card className="lg:border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {t("Login")}
        </CardTitle>
        <CardDescription>
          {t("Login to your account")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <React.Suspense fallback={<AuthFallback />}>
          <EmailPasswordLogin />
        </React.Suspense>
        <React.Suspense>
          <SocialLoginButtons onlySocial={false} google={true} github={true} />
        </React.Suspense>
      </CardContent>
    </Card>
  )
}
