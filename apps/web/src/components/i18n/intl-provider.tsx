"use client"

import { IntlErrorCode, NextIntlClientProvider } from "next-intl"
import type { ComponentProps } from "react"

type IntlProviderProps = ComponentProps<typeof NextIntlClientProvider>

export function IntlProvider(props: IntlProviderProps) {
  return (
    <NextIntlClientProvider
      {...props}
      onError={(error) => {
        if (error.code !== IntlErrorCode.MISSING_MESSAGE) {
          console.error(error)
        }
      }}
      getMessageFallback={({ key }) => key}
    />
  )
}
