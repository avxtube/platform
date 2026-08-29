import { Geist, Geist_Mono, Inter } from "next/font/google"

import "@workspace/ui/styles/globals.css"
import "@workspace/ui/styles/view-transition.css"
import "@workspace/ui/styles/flags.css"

import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { getMessages, setRequestLocale } from "next-intl/server";
import { localeDirections, localeTags } from "@workspace/i18n";
import { Metadata } from "next";
import { selectClientMessages } from "@/i18n/client-messages";


const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  metadataBase: new URL("https://vdohide.com"),
}

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})


export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={localeTags[locale]}
      dir={localeDirections[locale]}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <ThemeProvider>
          <NextIntlClientProvider
            locale={locale}
            messages={selectClientMessages(messages)}
          >
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
