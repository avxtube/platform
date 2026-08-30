
import React from "react";
import { SendIcon } from "lucide-react";
import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@workspace/ui/components";
import { AuthFallback, EmailPasswordRegister, SocialLoginButtons } from "@/components/auth";
import { DEFAULT_AUTH_SETTING } from "@workspace/core/config";
import { getSettingsByNames } from "@workspace/services/queries/setting";
import { getTranslations } from "next-intl/server";
import { createPageMetadata, LocalizedPageProps } from "@/i18n/metadata";
import { Link } from "@/i18n/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: LocalizedPageProps) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "auth" })
    return createPageMetadata({
        locale,
        pathname: "/register",
        title: t("register.metadataTitle"),
        description: t("register.description"),
    })
}

export default async function Registerpage() {
    const t = await getTranslations("auth");


    const { auth_setting = DEFAULT_AUTH_SETTING } = await getSettingsByNames(["auth_setting"]);

    if (!auth_setting.register.enabled || (!auth_setting.register.email_password && !auth_setting.register.social.google && !auth_setting.register.social.github)) {
        const closedUrl = auth_setting.register.closed_url?.trim() ?? "";
        const closedLabel = auth_setting.register.closed_label?.trim() || t("register.followUpdates");

        return (
            <Card className="lg:border-0">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">{t("register.closedTitle")}</CardTitle>
                    <CardDescription>
                        {closedUrl
                            ? t("register.closedFollowDescription")
                            : t("register.closedDescription")}
                    </CardDescription>
                </CardHeader>

                {closedUrl && (
                    <CardContent>
                        <Button
                            className="w-full"
                            render={(
                                <a
                                    href={closedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                />
                            )}
                        >
                            <SendIcon className="size-4" />
                            {closedLabel}
                        </Button>
                    </CardContent>
                )}

                <CardFooter className="justify-center text-sm">
                    {t("register.hasAccount")}
                    <Link href="/login" className="underline underline-offset-4 pl-2">
                        {t("register.signInHere")}
                    </Link>
                </CardFooter>
            </Card>
        )
    }

    return (
        <>
            <Card className="lg:border-0">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">{t("register.title")}</CardTitle>
                    <CardDescription>{t("register.description")}</CardDescription>
                </CardHeader>
                <CardContent>

                    {auth_setting.register.email_password && (
                        <React.Suspense fallback={<AuthFallback />}>
                            <EmailPasswordRegister captchaEnabled={auth_setting.captcha.enabled} />
                        </React.Suspense>
                    )}

                    <React.Suspense>
                        <SocialLoginButtons
                            onlySocial={!auth_setting.register.email_password}
                            google={auth_setting.register.social.google}
                            github={auth_setting.register.social.github}
                            signUp={true}
                        />
                    </React.Suspense>

                </CardContent>
                {auth_setting.login.enabled && (
                    <CardFooter className="justify-center text-sm">
                        {t("register.hasAccount")}
                        <Link href="/login" className="underline underline-offset-4 pl-2">
                            {t("register.signInHere")}
                        </Link>
                    </CardFooter>
                )}
            </Card>
        </>
    )
}
