"use client";

import { twoFactorVerifySchema, TwoFactorVerifyValues } from "@workspace/core/validators";
import { safeRedirectPath } from "@workspace/core/utils";
import { cn } from "@workspace/ui/lib/utils";
import {
    Button,
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    Input,
} from "@workspace/ui/components";
import { ShieldCheckIcon } from "lucide-react";
import { authClient } from "@workspace/auth/client";
import { useSearchParams } from "next/navigation";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState } from "react";
import { SubmitButton } from "@workspace/ui/components";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authTurnstileOptions } from "@/components/auth/turnstile-options";
import { useTranslations } from "next-intl";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export const TwoFactorVerifyForm = ({
    className,
    captchaEnabled = true,
}: {
    className?: string;
    captchaEnabled?: boolean;
}) => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl");
    const [loading, setLoading] = useState<boolean>(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance | null>(null);
    const t = useTranslations("auth");
    const showCaptcha = captchaEnabled && Boolean(TURNSTILE_SITE_KEY);

    const form = useForm<TwoFactorVerifyValues>({
        resolver: zodResolver(twoFactorVerifySchema),
        defaultValues: {
            code: "",
        },
    })

    const onCancel = async () => {
        setLoading(true);
        await fetch('/api/auth/clean-cookie', { method: 'POST' });
        window.location.href = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";
        setLoading(false);
    }

    const onSubmit = async (values: TwoFactorVerifyValues) => {
        if (showCaptcha && !captchaToken) {
            toast.error(t("message.captchaRequired"));
            return;
        }

        const toastId = toast.loading(t("twoFactor.verifying"));
        try {
            const cleanedCode = values.code.trim();

            // ตรวจสอบว่าเป็น TOTP (ตัวเลข 6 หลัก) หรือ Backup Code (มี -)
            const isTotp = /^\d{6}$/.test(cleanedCode);
            const isBackupCode = cleanedCode.includes('-');
            let data, error;
            if (isTotp) {
                const result = await authClient.twoFactor.verifyTotp({
                    code: cleanedCode,
                    fetchOptions: {
                        headers: {
                            "x-captcha-response": captchaToken,
                        },
                    },
                });
                data = result.data;
                error = result.error;
            } else if (isBackupCode) {
                const result = await authClient.twoFactor.verifyBackupCode({
                    code: cleanedCode,
                    fetchOptions: {
                        headers: {
                            "x-captcha-response": captchaToken,
                        },
                    },
                });
                data = result.data;
                error = result.error;
            } else {
                error = { message: t("twoFactor.invalidCode") };
            }
            if (error) {
                toast.error(error.message, { id: toastId, richColors: true });
                setCaptchaToken(null);
                turnstileRef.current?.reset();
            } else if (data) {
                toast.success(t("twoFactor.success"), { id: toastId, richColors: true });
                let finalCallbackUrl = callbackUrl;
                if (!finalCallbackUrl && typeof document !== "undefined") {
                    const match = document.cookie.match(/(^|;)\s*auth_callback_url\s*=\s*([^;]+)/);
                    if (match && match[2]) finalCallbackUrl = decodeURIComponent(match[2]);
                }
                if (typeof document !== "undefined") {
                    document.cookie = "auth_callback_url=; Max-Age=0; path=/;";
                }
                window.location.href = safeRedirectPath(finalCallbackUrl) || "/";
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t("message.unexpectedError");
            toast.error(errorMessage, { id: toastId, richColors: true });
            setCaptchaToken(null);
            turnstileRef.current?.reset();
        }
    }

    return (<>
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn("space-y-4", className)}
        >
            <FieldGroup>

                <Controller
                    name="code"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field>
                            <FieldLabel htmlFor={field.name}>{t("twoFactor.code")}</FieldLabel>
                            <Input
                                {...field}
                                id={field.name}
                                placeholder={t("twoFactor.codePlaceholder")}
                                disabled={form.formState.isSubmitting}
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[{ ...fieldState.error, message: t(fieldState.error?.message ?? "invalid.twoFactorCode") }]} />
                            )}
                        </Field>
                    )}
                />
            </FieldGroup>

            {/* Cloudflare Turnstile CAPTCHA */}
            {showCaptcha && (
                <div className="flex justify-center">
                    <Turnstile
                        ref={turnstileRef}
                        siteKey={TURNSTILE_SITE_KEY}
                        onSuccess={(token) => setCaptchaToken(token)}
                        onError={() => setCaptchaToken(null)}
                        onExpire={() => setCaptchaToken(null)}
                        options={authTurnstileOptions}
                    />
                </div>
            )}

            <SubmitButton
                text={t("twoFactor.verify")}
                textLoading={t("twoFactor.verifying")}
                icon={<ShieldCheckIcon />}
                showSpinner={true}
                isSubmitting={form.formState.isSubmitting}
                disabled={form.formState.isSubmitting || (showCaptcha && !captchaToken)}
                className="w-full rounded-full"
            />
            <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="w-full"
            >
                {t("action.backToLogin")}
            </Button>
        </form>
    </>)
}
