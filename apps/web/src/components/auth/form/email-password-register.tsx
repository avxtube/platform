"use client"

import { RegisterFormValues, registerSchema } from "@workspace/core/validators"
import { cn } from "@workspace/ui/lib/utils"
import { LogInIcon } from "lucide-react"
import { authClient } from "@workspace/auth/client"
import { getPathname, Link, useRouter } from "@/i18n/navigation"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { useRef, useState } from "react"
import {
  Checkbox,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  InputPassword,
  SubmitButton,
} from "@workspace/ui/components"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { authTurnstileOptions } from "@/components/auth/turnstile-options"
import { useLocale, useTranslations } from "next-intl"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""

export const EmailPasswordRegister = ({
  className,
  captchaEnabled = true,
}: {
  className?: string
  captchaEnabled?: boolean
}) => {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("auth")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const showCaptcha = captchaEnabled && Boolean(TURNSTILE_SITE_KEY)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
    },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    if (showCaptcha && !captchaToken) {
      toast.error(t("message.captchaRequired"))
      return
    }

    const toastId = toast.loading(t("action.registering"))
    try {
      const { data, error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        username: values.username || undefined,
        callbackURL: getPathname({ locale, href: "/verify-email" }),
        fetchOptions: {
          headers: {
            "x-captcha-response": captchaToken,
          },
        },
      })
      if (error) {
        toast.error(error.message, { id: toastId, richColors: true })
        // Reset Turnstile หลัง error เพื่อให้ verify ใหม่
        setCaptchaToken(null)
        turnstileRef.current?.reset()
      }
      if (data) {
        toast.success(t("register.success"), {
          id: toastId,
          richColors: true,
        })
        router.push(
          `/verify-email?email=${encodeURIComponent(form.getValues("email"))}`
        )
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("message.unexpectedError")
      toast.error(errorMessage, { id: toastId, richColors: true })
      setCaptchaToken(null)
      turnstileRef.current?.reset()
    }
  }

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-4", className)}
      >
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("field.name")}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder={t("field.namePlaceholder")}
                  type="text"
                  disabled={form.formState.isSubmitting}
                />
                {fieldState.invalid && (
                  <FieldError errors={[{ ...fieldState.error, message: t(fieldState.error?.message ?? "invalid.nameMin") }]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="username"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("field.usernameOptional")}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  value={field.value ?? ""}
                  onChange={(event) =>
                    field.onChange(event.target.value.replace(/[^a-zA-Z0-9]/g, ""))
                  }
                  placeholder={t("field.usernamePlaceholder")}
                  type="text"
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                  disabled={form.formState.isSubmitting}
                />
                {fieldState.invalid && (
                  <FieldError errors={[{ ...fieldState.error, message: t(fieldState.error?.message ?? "invalid.usernameCharacters") }]} />
                )}
              </Field>
            )}
          />
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
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("field.password")}</FieldLabel>
                <InputPassword
                  {...field}
                  id={field.name}
                  placeholder={t("field.passwordPlaceholder")}
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
                  placeholder={t("field.confirmPasswordPlaceholder")}
                  disabled={form.formState.isSubmitting}
                  autoComplete="new-password"
                />
                {fieldState.invalid && (
                  <FieldError errors={[{ ...fieldState.error, message: t(fieldState.error?.message ?? "invalid.passwordMismatch") }]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="agreeTerms"
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldGroup data-slot="checkbox-group">
                <Field orientation="horizontal" className="items-start">
                  <Checkbox
                    id={field.name}
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldLabel
                    htmlFor={field.name}
                    className="flex-col items-start gap-0.5 font-normal"
                  >
                    <span>
                      {t("terms.agree")}{" "}
                      <Link
                        className="font-semibold underline underline-offset-4"
                        href="/legal/terms"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {t("terms.service")}
                      </Link>
                    </span>
                    <span>
                      {t("terms.acknowledge")}{" "}
                      <Link
                        className="font-semibold underline underline-offset-4"
                        href="/legal/privacy"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {t("terms.privacy")}
                      </Link>
                    </span>
                  </FieldLabel>
                </Field>

                {fieldState.invalid && (
                  <FieldError errors={[{ ...fieldState.error, message: t(fieldState.error?.message ?? "invalid.agreeTerms") }]} />
                )}
              </FieldGroup>
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
          text={t("action.register")}
          textLoading={t("action.registering")}
          icon={<LogInIcon />}
          showSpinner={true}
          isSubmitting={form.formState.isSubmitting}
          disabled={
            !form.formState.isValid || (showCaptcha && !captchaToken)
          }
          className="w-full rounded-full"
        />
      </form>
    </>
  )
}
