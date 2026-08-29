import React from "react"

import { LanguageSwitcher } from "@/components/i18n/language-switcher"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="marketing-scope flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="absolute top-5 right-5 z-20">
        <LanguageSwitcher />
      </div>
      <div className="fixed inset-0 z-0 min-h-full min-w-full rounded-lg opacity-70">
        <img
          src="/assets/images/world-map.svg"
          className="pointer-events-none h-full w-full object-cover select-none"
          alt=""
          height="495"
          width="1056"
          draggable="false"
          style={{ filter: "none", opacity: "var(--map-opacity)" }}
        />
      </div>
      <div className="z-10 flex w-full max-w-md flex-col gap-6">{children}</div>
    </div>
  )
}
