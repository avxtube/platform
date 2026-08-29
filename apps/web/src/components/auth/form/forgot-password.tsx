"use client";

import { EmailValid, EmailValidInfer } from "@workspace/core/validators";
import { cn } from "@workspace/ui/lib/utils";
import { MailIcon } from "lucide-react";
import { authClient } from "@workspace/auth/client";
import { Turnstile } from "@marsidev/react-turnstile";
import { useRef, useState } from "react";
import { Field, FieldError, FieldGroup, FieldLabel, Input } from "@workspace/ui/components";
import { SubmitButton } from "@workspace/ui/components";
import { useRouter } from "@/i18n/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export const ForgotPasswordForm = ({ className }: { className?: string }) => {
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const turnstileRef = useRef<any>(null);
    const router = useRouter();

    const form = useForm<EmailValidInfer>({
        resolver: zodResolver(EmailValid),
        defaultValues: {
            email: "",
        },
    })

    const onSubmit = async (values: EmailValidInfer) => {
        if (!!TURNSTILE_SITE_KEY && !captchaToken) {
            toast.error("Please verify you are not a robot");
            return;
        }

        const toastId = toast.loading("Loading...");
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
                toast.success("If an account exists with this email, you will receive a password reset link shortly.", { id: toastId, richColors: true });
                router.push(`/verify-email?from=forgot-password`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unexpected error occurred. Please try again.";
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
                            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                            <Input
                                {...field}
                                id={field.name}
                                placeholder="Enter your email"
                                type="email"
                                disabled={form.formState.isSubmitting}
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[fieldState.error]} />
                            )}
                        </Field>
                    )}
                />
            </FieldGroup>

            {/* Cloudflare Turnstile CAPTCHA */}
            {TURNSTILE_SITE_KEY && (
                <div className="flex justify-center">
                    <Turnstile
                        ref={turnstileRef}
                        siteKey={TURNSTILE_SITE_KEY}
                        onSuccess={(token) => setCaptchaToken(token)}
                        onError={() => setCaptchaToken(null)}
                        onExpire={() => setCaptchaToken(null)}
                        options={{
                            theme: "auto",
                            size: "flexible",
                        }}
                    />
                </div>
            )}

            <SubmitButton
                text="Send Reset Link"
                textLoading="Sending..."
                icon={<MailIcon />}
                showSpinner={true}
                isSubmitting={form.formState.isSubmitting}
                disabled={!form.formState.isValid || (!!TURNSTILE_SITE_KEY && !captchaToken)}
                className="w-full rounded-full"
            />
        </form>
    </>)
}
