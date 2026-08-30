"use client";

import { setPasswordSchema, SetPasswordValidInfer } from "@workspace/core/validators";
import { cn } from "@workspace/ui/lib/utils";
import { KeyRoundIcon } from "lucide-react";
import { authClient } from "@workspace/auth/client";
import { useRouter } from "@/i18n/navigation";
import { Field, FieldError, FieldGroup, FieldLabel, InputPassword } from "@workspace/ui/components";
import { SubmitButton } from "@workspace/ui/components";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";

export const SetPasswordForm = ({ token, className }: { token: string, className?: string }) => {
    const router = useRouter();
    const t = useTranslations("auth");

    const form = useForm<SetPasswordValidInfer>({
        resolver: zodResolver(setPasswordSchema),
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
    })

    const onSubmit = async (values: SetPasswordValidInfer) => {
        const toastId = toast.loading(t("setPassword.resetting"));
        try {
            const { error } = await authClient.resetPassword({
                newPassword: values.newPassword,
                token,
            });

            if (error) {
                toast.error(error.message, { id: toastId, richColors: true });
            } else {
                toast.success(t("setPassword.success"), { id: toastId, richColors: true });
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t("message.unexpectedError");
            toast.error(errorMessage, { id: toastId, richColors: true });
        }
    }

    return (<>
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn("space-y-4", className)}
        >
            <FieldGroup>
                <Controller
                    name="newPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field>
                            <FieldLabel htmlFor={field.name}>{t("field.newPassword")}</FieldLabel>
                            <InputPassword
                                {...field}
                                id={field.name}
                                placeholder={t("field.newPasswordPlaceholder")}
                                disabled={form.formState.isSubmitting}
                                autoComplete="new-password"
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[{ ...fieldState.error, message: t(fieldState.error?.message ?? "required.password") }]} />
                            )}
                        </Field>
                    )}
                />

                <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field>
                            <FieldLabel htmlFor={field.name}>{t("field.confirmPassword")}</FieldLabel>
                            <InputPassword
                                {...field}
                                id={field.name}
                                placeholder={t("field.confirmNewPasswordPlaceholder")}
                                disabled={form.formState.isSubmitting}
                                autoComplete="new-password"
                            />
                            {fieldState.invalid && (
                                <FieldError errors={[{ ...fieldState.error, message: t(fieldState.error?.message ?? "invalid.passwordMismatch") }]} />
                            )}
                        </Field>
                    )}
                />
            </FieldGroup>

            <SubmitButton
                text={t("setPassword.reset")}
                textLoading={t("setPassword.resetting")}
                icon={<KeyRoundIcon />}
                showSpinner={true}
                isSubmitting={form.formState.isSubmitting}
                disabled={!form.formState.isValid}
                className="w-full rounded-full"
            />
        </form>
    </>)
}
