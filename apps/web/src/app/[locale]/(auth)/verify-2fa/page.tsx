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
import { AuthFallback, TwoFactorVerifyForm } from "@/components/auth";
import { getTranslations } from "next-intl/server";
import { DEFAULT_AUTH_SETTING } from "@workspace/core/config";
import { getSettingsByNames } from "@workspace/services/queries/setting";

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
    const t = await getTranslations("auth");
    return {
        title: t("twoFactor.title"),
    }
}

type Props = {
    searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function Verify2FApage(props: Props) {
    const t = await getTranslations("auth");
    const { auth_setting = DEFAULT_AUTH_SETTING } = await getSettingsByNames(["auth_setting"]);
    const searchParams = await props.searchParams;
    const callbackUrl = searchParams.callbackUrl;

    return (
        <>
            <Card className="lg:border-0">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">{t("twoFactor.title")}</CardTitle>
                    <CardDescription>{t("twoFactor.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <React.Suspense fallback={<AuthFallback />}>
                        <TwoFactorVerifyForm
                            className=""
                            captchaEnabled={auth_setting.captcha.enabled}
                        />
                    </React.Suspense>
                </CardContent>
                <CardFooter className="justify-center text-sm">
                    <Link href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"} className="underline underline-offset-4 pl-2">
                        {t("action.backToLogin")}
                    </Link>
                </CardFooter>
            </Card>
        </>
    )
}
