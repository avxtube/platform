import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@workspace/ui/components";
import React from "react";
import { Link } from "@/i18n/navigation";
import { DEFAULT_AUTH_SETTING } from "@workspace/core/config";
import { AuthFallback, ForgotPasswordForm } from "@/components/auth";
import { getSettingsByNames } from "@workspace/services/queries/setting";
import { getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
    const t = await getTranslations("auth");
    return {
        title: t("forgotPassword.title"),
    }
}

export default async function ForgotPasswordPage() {
    const t = await getTranslations("auth");
    const { auth_setting = DEFAULT_AUTH_SETTING } = await getSettingsByNames(["auth_setting"]);

    if (!auth_setting.forgot_password.enabled) {
        return (
            <Card className="lg:border-0">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">{t("forgotPassword.closedTitle")}</CardTitle>
                    <CardDescription>{t("forgotPassword.closedDescription")}</CardDescription>
                </CardHeader>
                <CardFooter className="justify-center text-sm">
                    <span className="text-muted-foreground mr-1">{t("forgotPassword.remember")}</span>
                    <Link href="/login" className="underline underline-offset-4">
                        {t("action.backToLogin")}
                    </Link>
                </CardFooter>
            </Card>
        )
    }

    return (
        <>
            <Card className="lg:border-0">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">{t("forgotPassword.title")}</CardTitle>
                    <CardDescription>{t("forgotPassword.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <React.Suspense fallback={<AuthFallback />}>
                        <ForgotPasswordForm captchaEnabled={auth_setting.captcha.enabled} />
                    </React.Suspense>
                </CardContent>
                <CardFooter className="justify-center text-sm">
                    <span className="text-muted-foreground mr-1">{t("forgotPassword.remember")}</span>
                    <Link href="/login" className="underline underline-offset-4">
                        {t("action.backToLogin")}
                    </Link>
                </CardFooter>
            </Card>
        </>
    )
}
