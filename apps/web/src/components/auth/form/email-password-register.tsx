"use client"

import { RegisterFormValues, registerSchema } from "@workspace/core/validators"
import { cn } from "@workspace/ui/lib/utils"
import { LogInIcon } from "lucide-react"
import { authClient } from "@workspace/auth/client"
import { Link, useRouter } from "@/i18n/navigation"
import { Turnstile } from "@marsidev/react-turnstile"
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

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""

export const EmailPasswordRegister = ({
  className,
}: {
  className?: string
}) => {
  const router = useRouter()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<any>(null)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
    },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    if (!captchaToken) {
      toast.error("Please verify you are not a robot")
      return
    }

    const toastId = toast.loading("Loading...")
    try {
      const { data, error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
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
        toast.success("Registration successful. Please verify your email.", {
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
          : "Unexpected error occurred. Please try again."
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
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="Enter your name"
                  type="text"
                  disabled={form.formState.isSubmitting}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
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
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <InputPassword
                  {...field}
                  id={field.name}
                  placeholder="Enter your password"
                  disabled={form.formState.isSubmitting}
                  autoComplete="new-password"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                <InputPassword
                  {...field}
                  id={field.name}
                  placeholder="Confirm your password"
                  disabled={form.formState.isSubmitting}
                  autoComplete="new-password"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="agreeTerms"
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
                    I agree to the{" "}
                    <Link
                      className="font-semibold underline underline-offset-4"
                      href="/legal/terms"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Terms of Service
                    </Link>{" "}
                    and acknowledge the{" "}
                    <Link
                      className="font-semibold underline underline-offset-4"
                      href="/legal/privacy"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>
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
          text="Register"
          textLoading="Loading..."
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
