"use client"

import * as React from "react"

import { usePathname } from "@/i18n/navigation"

import { ViewerHeader } from "./viewer-header"
import { ViewerDrawer, ViewerMobileNavigation, ViewerSidebar } from "./viewer-navigation"

function useMediaQuery(query: string) {
  const subscribe = React.useCallback((onChange: () => void) => {
    const mediaQuery = window.matchMedia(query)
    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
  }, [query])
  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query])
  const getServerSnapshot = React.useCallback(() => false, [])
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function ViewerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isWatchPage = pathname === "/watch" || pathname.startsWith("/watch/")
  const isShortsPage = pathname === "/shorts" || pathname.startsWith("/shorts/")
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const usesDrawer = isWatchPage || !isDesktop
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [drawerPathname, setDrawerPathname] = React.useState<string | null>(null)
  const drawerOpen = usesDrawer && drawerPathname === pathname

  React.useEffect(() => {
    if (!drawerOpen) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerPathname(null)
    }
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [drawerOpen])

  const closeDrawer = React.useCallback(() => setDrawerPathname(null), [])
  const toggleNavigation = React.useCallback(() => {
    if (usesDrawer) {
      setDrawerPathname((current) => current === pathname ? null : pathname)
    } else {
      setDrawerPathname(null)
      setSidebarCollapsed((current) => !current)
    }
  }, [pathname, usesDrawer])

  return (
    <div className="min-h-svh bg-background">
      <ViewerHeader menuExpanded={usesDrawer ? drawerOpen : !sidebarCollapsed} onMenuToggle={toggleNavigation} />
      {!isWatchPage && <ViewerSidebar collapsed={sidebarCollapsed} />}
      <ViewerDrawer open={drawerOpen} onClose={closeDrawer} />
      <main className={`pt-16 transition-[padding] duration-200 ${isWatchPage ? "pb-6" : `pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 ${sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-60"}`}`}>
        <div className={`mx-auto w-full px-4 ${isWatchPage ? "max-w-[1800px] py-4 sm:px-6 lg:px-8" : isShortsPage ? "max-w-[1700px] px-0 py-0 lg:px-7 lg:py-4" : "max-w-[1700px] py-4 sm:px-6 lg:px-7"}`}>
          {children}
        </div>
      </main>
      {!isWatchPage && <ViewerMobileNavigation />}
    </div>
  )
}
