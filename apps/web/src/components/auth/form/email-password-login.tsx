"use client"

import { cn } from "@workspace/ui/lib/utils"
import { LogInIcon } from "lucide-react"
import { authClient } from "@workspace/auth/client"
import { Link, useRouter } from "@/i18n/navigation"
import { Turnstile } from "@marsidev/react-turnstile"
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


const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""

export const EmailPasswordLogin = ({ className }: { className?: string }) => {
  const router = useRouter()
  const t = useTranslations()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<any>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    if (!captchaToken) {
      toast.error(t("Please verify you are not a robot"))
      return
    }

    const toastId = toast.loading(t("Loading..."))
    try {
      const { data, error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
        fetchOptions: {
          headers: {
            "x-captcha-response": captchaToken,
          },
        },
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
          toast.info(t("Please verify your two-factor authentication"))
          const redirectUrl = callbackUrl
            ? `/verify-2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`
            : "/verify-2fa"
          router.push(redirectUrl)
        } else {
          toast.success(t("Login successful"), {
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
          : t("Unexpected error occurred. Please try again.")
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
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>{t("Email")}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder={t("Enter your email")}
                  type="email"
                  disabled={form.formState.isSubmitting}
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError
                    errors={[
                      {
                        ...fieldState.error,
                        message: t(
                          {
                            "required.email": "Email is required.",
                            "invalid.email": "Enter a valid email address.",
                          }[fieldState.error.message ?? ""] ??
                            fieldState.error.message ??
                            ""
                        ),
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
                  <FieldLabel htmlFor={field.name}>{t("Password")}</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {t("Forgot password?")}
                  </Link>
                </div>
                <InputPassword
                  {...field}
                  id={field.name}
                  placeholder={t("Enter your password")}
                  disabled={form.formState.isSubmitting}
                  autoComplete="current-password"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError
                    errors={[
                      {
                        ...fieldState.error,
                        message: t(
                          {
                            "required.password": "Password is required.",
                            "invalid.passwordMin":
                              "Password must contain at least 8 characters.",
                          }[fieldState.error.message ?? ""] ??
                            fieldState.error.message ??
                            ""
                        ),
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
                    {t("Remember me")}
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
          text={t("Login")}
          textLoading={t("Logging in...")}
          icon={<LogInIcon />}
          showSpinner={true}
          isSubmitting={form.formState.isSubmitting}
          disabled={
            !form.formState.isValid || (!!TURNSTILE_SITE_KEY && !captchaToken)
          }
          className="w-full rounded-full"
        />
      </form>
    </>
  )
}
