"use client"

import React from "react"
import { Button } from "@workspace/ui/components"
import { authClient } from "@workspace/auth/client"
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { getPathname } from "@/i18n/navigation";

interface ResendVerifyEmailProps {
    email?: string;
}

export function ResendVerifyEmail({ email }: ResendVerifyEmailProps) {
    const locale = useLocale();
    const t = useTranslations("auth");
    const [countdown, setCountdown] = React.useState(0);
    const [isSending, setIsSending] = React.useState(false);

    React.useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleResend = async () => {
        if (!email || countdown > 0 || isSending) return;

        setIsSending(true);
        try {
            const { error } = await authClient.sendVerificationEmail({
                email,
                callbackURL: getPathname({ locale, href: "/verify-email" }),
            });

            if (error) {
                throw new Error(error.message || t("verifyEmail.resendError"));
            }
            toast.success(
                t("verifyEmail.resendSuccess"),
                { richColors: true }
            );
            setCountdown(60);
        } catch {
            toast.error(
                t("verifyEmail.resendError"),
                { richColors: true }
            );
        } finally {
            setIsSending(false);
        }
    };

    if (!email) return null;

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={countdown > 0 || isSending}
            onClick={handleResend}
        >
            {isSending
                ? t("verifyEmail.sending")
                : countdown > 0
                    ? t("verifyEmail.resendIn", { seconds: countdown })
                    : t("verifyEmail.resend")}
        </Button>
    );
}
