"use client"

import React from "react"
import { Button } from "@workspace/ui/components"
import { authClient } from "@workspace/auth/client"
import { toast } from "sonner";

interface ResendVerifyEmailProps {
    email?: string;
}

export function ResendVerifyEmail({ email }: ResendVerifyEmailProps) {
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
            await authClient.sendVerificationEmail({
                email,
                callbackURL: "/",
            });
            toast.success(
                "Verification email sent. Please check your inbox.",
                { richColors: true }
            );
            setCountdown(60);
        } catch {
            toast.error(
                "Failed to send verification email. Please try again.",
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
                ? "Sending..."
                : countdown > 0
                    ? `Resend in ${countdown}s`
                    : "Didn't receive it? Resend"}
        </Button>
    );
}
