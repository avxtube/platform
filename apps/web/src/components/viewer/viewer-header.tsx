"use client"

import * as React from "react"
import { ArrowLeft, Menu, Search } from "lucide-react"
import { useTranslations } from "next-intl"

import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { useRouter } from "@/i18n/navigation"

import { ViewerAuthActions } from "./viewer-auth-actions"
import { ViewerBrand } from "./viewer-brand"
import { viewerRoutes } from "./viewer-routes"

type ViewerHeaderProps = {
  menuExpanded: boolean
  onMenuToggle: () => void
}

function ViewerSearch({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const t = useTranslations("viewer")
  const router = useRouter()
  const [query, setQuery] = React.useState("")

  return (
    <form
      className={mobile ? "flex min-w-0 flex-1" : "hidden w-full max-w-2xl md:flex"}
      onSubmit={(event) => {
        event.preventDefault()
        const value = query.trim()
        if (!value) return
        onClose?.()
        router.push(`${viewerRoutes.search}?q=${encodeURIComponent(value)}`)
      }}
    >
      <input
        type="search"
        value={query}
        autoFocus={mobile}
        aria-label={t("search.label")}
        placeholder={t("search.placeholder")}
        onChange={(event) => setQuery(event.target.value)}
        className="h-10 min-w-0 flex-1 rounded-l-full border bg-background px-5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      <button
        type="submit"
        aria-label={t("search.submit")}
        className="flex h-10 w-14 shrink-0 items-center justify-center rounded-r-full border border-l-0 bg-muted hover:bg-accent sm:w-16"
      >
        <Search className="size-5" />
      </button>
    </form>
  )
}

export function ViewerHeader({ menuExpanded, onMenuToggle }: ViewerHeaderProps) {
  const t = useTranslations("viewer")
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false)

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 grid h-16 grid-cols-[1fr_auto] items-center border-b border-border/70 bg-background/95 px-2 backdrop-blur-xl sm:px-4 md:grid-cols-[minmax(180px,1fr)_minmax(320px,42rem)_minmax(180px,1fr)]">
        <div className="flex shrink-0 items-center gap-2 justify-self-start sm:gap-4">
          <button
            type="button"
            aria-label={menuExpanded ? t("navigation.collapse") : t("navigation.expand")}
            aria-controls="viewer-navigation"
            aria-expanded={menuExpanded}
            onClick={onMenuToggle}
            className="flex size-9 items-center justify-center rounded-full hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <ViewerBrand />
        </div>

        <ViewerSearch />

        <div className="ml-auto flex items-center justify-end gap-1 justify-self-end">
          <button
            type="button"
            aria-label={t("search.open")}
            onClick={() => setMobileSearchOpen(true)}
            className="flex size-9 items-center justify-center rounded-full hover:bg-muted md:hidden"
          >
            <Search className="size-5" />
          </button>
          {/* <div className="hidden sm:block">
            <LanguageSwitcher />
          </div> */}
          <ViewerAuthActions />
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="fixed inset-x-0 top-0 z-[60] flex h-16 items-center gap-2 border-b bg-background px-2 shadow-sm sm:px-4 md:hidden">
          <button
            type="button"
            aria-label={t("search.close")}
            onClick={() => setMobileSearchOpen(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </button>
          <ViewerSearch mobile onClose={() => setMobileSearchOpen(false)} />
        </div>
      )}
    </>
  )
}
