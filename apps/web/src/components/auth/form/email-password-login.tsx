"use client"

import { cn } from "@workspace/ui/lib/utils"
import { LogInIcon } from "lucide-react"
import { authClient } from "@workspace/auth/client"
import { Link, useRouter } from "@/i18n/navigation"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
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
import { safeRedirectPath } from "@workspace/core/utils"
import { LoginFormValues, loginSchema } from "@workspace/core/validators"
import { useTranslations } from "next-intl"
import { authTurnstileOptions } from "@/components/auth/turnstile-options"


const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""

export const EmailPasswordLogin = ({
  className,
  captchaEnabled = true,
}: {
  className?: string
  captchaEnabled?: boolean
}) => {
  const router = useRouter()
  const t = useTranslations("auth")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const showCaptcha = captchaEnabled && Boolean(TURNSTILE_SITE_KEY)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: true,
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    if (showCaptcha && !captchaToken) {
      toast.error(t("message.captchaRequired"))
      return
    }

    const toastId = toast.loading(t("action.loggingIn"))
    try {
      const credentials = {
        password: values.password,
        rememberMe: values.rememberMe,
        fetchOptions: {
          headers: {
            "x-captcha-response": captchaToken,
          },
        },
      }
      const { data, error } = values.identifier.includes("@")
        ? await authClient.signIn.email({
            ...credentials,
            email: values.identifier,
          })
        : await authClient.signIn.username({
            ...credentials,
            username: values.identifier,
          })
      if (error) {
        toast.error(error.message, { id: toastId, richColors: true })
        setCaptchaToken(null)
        turnstileRef.current?.reset()
      }
      if (data) {
        const searchParams = new URLSearchParams(window.location.search)
        const callbackUrl = searchParams.get("callbackUrl")

        if (
          (data as typeof data & { twoFactorRedirect?: boolean })
            ?.twoFactorRedirect
        ) {
          toast.info(t("message.twoFactorRequired"))
          const redirectUrl = callbackUrl
            ? `/verify-2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`
            : "/verify-2fa"
          router.push(redirectUrl)
        } else {
          toast.success(t("login.success"), {
            id: toastId,
            richColors: true,
          })
          router.push(safeRedirectPath(callbackUrl) || "/")
        }
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
            name="identifier"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("field.identifier")}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder={t("field.identifierPlaceholder")}
                  type="text"
                  autoComplete="username"
                  disabled={form.formState.isSubmitting}
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError
                    errors={[
                      {
                        ...fieldState.error,
                        message: t(fieldState.error.message ?? "invalid.identifier"),
                      },
                    ]}
                  />
                )}
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <div className="flex w-full items-center justify-between">
                  <FieldLabel htmlFor={field.name}>{t("field.password")}</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {t("forgotPassword.title")}
                  </Link>
                </div>
                <InputPassword
                  {...field}
                  id={field.name}
                  placeholder={t("field.passwordPlaceholder")}
                  disabled={form.formState.isSubmitting}
                  autoComplete="current-password"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError
                    errors={[
                      {
                        ...fieldState.error,
                        message: t(fieldState.error.message ?? "required.password"),
                      },
                    ]}
                  />
                )}
              </Field>
            )}
          />

          <Controller
            name="rememberMe"
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldGroup data-slot="checkbox-group">
                <Field orientation="horizontal">
                  <Checkbox
                    id={field.name}
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldLabel htmlFor={field.name}>
                    {t("field.rememberMe")}
                  </FieldLabel>
                </Field>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
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
          text={t("action.login")}
          textLoading={t("action.loggingIn")}
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
