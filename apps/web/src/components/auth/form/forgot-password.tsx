"use client";

import { EmailValid, EmailValidInfer } from "@workspace/core/validators";
import { cn } from "@workspace/ui/lib/utils";
import { MailIcon } from "lucide-react";
import { authClient } from "@workspace/auth/client";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useState } from "react";
import { Field, FieldError, FieldGroup, FieldLabel, Input } from "@workspace/ui/components";
import { SubmitButton } from "@workspace/ui/components";
import { useRouter } from "@/i18n/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authTurnstileOptions } from "@/components/auth/turnstile-options";
import { useTranslations } from "next-intl";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export const ForgotPasswordForm = ({
    className,
    captchaEnabled = true,
}: {
    className?: string;
    captchaEnabled?: boolean;
}) => {
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance | null>(null);
    const router = useRouter();
    const t = useTranslations("auth");
    const showCaptcha = captchaEnabled && Boolean(TURNSTILE_SITE_KEY);

    const form = useForm<EmailValidInfer>({
        resolver: zodResolver(EmailValid),
        defaultValues: {
            email: "",
        },
    })

    const onSubmit = async (values: EmailValidInfer) => {
        if (showCaptcha && !captchaToken) {
            toast.error(t("message.captchaRequired"));
            return;
        }

        const toastId = toast.loading(t("forgotPassword.sending"));
        try {
            const { error } = await authClient.requestPasswordReset({
                email: values.email,
                redirectTo: "/set-password",
                fetchOptions: {
                    headers: {
                        "x-captcha-response": captchaToken || "",
                    },
                },
            });
            if (error) {
                toast.error(error.message, { id: toastId, richColors: true });
                setCaptchaToken(null);
                turnstileRef.current?.reset();
            } else {
                toast.success(t("forgotPassword.sent"), { id: toastId, richColors: true });
                router.push(`/verify-email?from=forgot-password`);
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
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field>
                            <FieldLabel htmlFor={field.name}>{t("field.email")}</FieldLabel>
                            <Input
                                {...field}
                                id={field.name}
                                placeholder={t("field.emailPlaceholder")}
                                type="email"
                                disabled={form.formState.isSubmitting}
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[{ ...fieldState.error, message: t(fieldState.error?.message ?? "invalid.email") }]} />
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
                text={t("forgotPassword.sendResetLink")}
                textLoading={t("forgotPassword.sending")}
                icon={<MailIcon />}
                showSpinner={true}
                isSubmitting={form.formState.isSubmitting}
                disabled={!form.formState.isValid || (showCaptcha && !captchaToken)}
                className="w-full rounded-full"
            />
        </form>
    </>)
}
