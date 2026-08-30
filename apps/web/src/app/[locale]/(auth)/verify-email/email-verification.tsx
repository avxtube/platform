"use client";

import React from "react";
import {
    buttonVariants,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle, Loader2, ShieldX } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Status = "verifying" | "success" | "error";

export function EmailVerification({ token }: { token?: string }) {
    const t = useTranslations("auth");
    const [status, setStatus] = React.useState<Status>(token ? "verifying" : "error");

    React.useEffect(() => {
        if (!token) return;

        const controller = new AbortController();

        async function verifyEmail() {
            try {
                const response = await fetch(
                    `/api/auth/verify-email?token=${encodeURIComponent(token!)}`,
                    {
                        credentials: "include",
                        redirect: "manual",
                        signal: controller.signal,
                    },
                );

                if (!controller.signal.aborted) {
                    setStatus(response.ok ? "success" : "error");
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("[Auth] Failed to verify email", error);
                    setStatus("error");
                }
            }
        }

        void verifyEmail();
        return () => controller.abort();
    }, [token]);

    if (status === "verifying") {
        return (
            <Card className="w-full max-w-md border-none shadow-none">
                <CardHeader className="space-y-4 text-center">
                    <div className="flex justify-center">
                        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                            <Loader2 className="size-8 animate-spin text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">{t("verifyEmail.verifyingTitle")}</CardTitle>
                    <CardDescription className="text-base">
                        {t("verifyEmail.verifyingDescription")}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (status === "success") {
        return (
            <Card className="w-full max-w-md border-none shadow-none">
                <CardHeader className="space-y-4 text-center">
                    <div className="flex justify-center">
                        <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircle className="size-8 text-green-500" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">{t("verifyEmail.verifiedTitle")}</CardTitle>
                    <CardDescription className="text-base">
                        {t("verifyEmail.verifiedDescription")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link
                        href="/login"
                        className={cn(buttonVariants(), "w-full rounded-full")}
                    >
                        {t("action.backToLogin")}
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md border-none shadow-none">
            <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                        <ShieldX className="size-8 text-destructive" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">{t("verifyEmail.invalidTitle")}</CardTitle>
                <CardDescription className="text-base">
                    {t("verifyEmail.invalidDescription")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Link
                    href="/login"
                    className={cn(buttonVariants(), "w-full rounded-full")}
                >
                    {t("action.backToLogin")}
                </Link>
            </CardContent>
        </Card>
    );
}
