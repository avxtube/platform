import type { TurnstileProps } from "@marsidev/react-turnstile"

export const AUTH_TURNSTILE_ACTION = "auth"

export const authTurnstileOptions = {
  theme: "auto",
  size: "flexible",
  appearance: "interaction-only",
  action: AUTH_TURNSTILE_ACTION,
  retry: "auto",
  refreshExpired: "auto",
  refreshTimeout: "auto",
} as const satisfies NonNullable<TurnstileProps["options"]>
