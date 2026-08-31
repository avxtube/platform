"use client"

import * as React from "react"
import { Bell, CircleUserRound, MoreVertical, Plus } from "lucide-react"
import { useTranslations } from "next-intl"

import { authClient } from "@workspace/auth/client"
import { Popover, PopoverTrigger, buttonVariants } from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"
import { useNotificationCenter } from "@/hooks/use-notification-center"

import { ViewerAvatar } from "./viewer-avatar"
import { ViewerCreateMenu } from "./viewer-create-menu"
import { ViewerGuestMenu } from "./viewer-guest-menu"
import { ViewerNotificationsMenu } from "./viewer-notifications-menu"
import { ViewerProfileMenu } from "./viewer-profile-menu"

type HeaderMenu = "create" | "notifications" | "profile" | "guest"

export function ViewerAuthActions() {
  const auth = useTranslations("auth")
  const t = useTranslations("viewer.header")
  const account = useTranslations("viewer.account")
  const { data: session, isPending } = authClient.useSession()
  const [openMenu, setOpenMenu] = React.useState<HeaderMenu | null>(null)
  const notificationCenter = useNotificationCenter()

  const closeMenus = React.useCallback(() => setOpenMenu(null), [])
  const setMenuOpen = React.useCallback(
    (menu: HeaderMenu, open: boolean) => setOpenMenu(open ? menu : null),
    []
  )

  if (isPending) {
    return (
      <div className="ml-auto flex min-w-0 items-center justify-end md:min-w-36">
        <span
          role="status"
          aria-label={t("checkingAccount")}
          className="size-8 animate-pulse rounded-full bg-muted"
        />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="ml-auto flex min-w-0 items-center justify-end gap-1 md:min-w-36">
        <Popover open={openMenu === "guest"} onOpenChange={(open) => setMenuOpen("guest", open)}>
          <PopoverTrigger type="button" aria-label={account("guestMenu")} className="flex size-9 items-center justify-center rounded-full hover:bg-muted"><MoreVertical className="size-5" /></PopoverTrigger>
          <ViewerGuestMenu onSelect={closeMenus} />
        </Popover>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-full border-blue-500 px-3 text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 sm:px-4 dark:text-blue-400"
          )}
        >
          <CircleUserRound />
          <span className="hidden min-[420px]:inline">{auth("action.login")}</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="ml-auto flex min-w-0 items-center justify-end gap-1 md:min-w-36">
      <Popover open={openMenu === "create"} onOpenChange={(open) => setMenuOpen("create", open)}>
        <PopoverTrigger
          type="button"
          aria-label={t("create")}
          className="hidden h-9 items-center gap-2 rounded-full bg-muted px-3 text-sm font-semibold hover:bg-accent min-[480px]:flex sm:px-4"
        >
          <Plus className="size-5" /> {t("create")}
        </PopoverTrigger>
        <ViewerCreateMenu onSelect={closeMenus} />
      </Popover>

      <Popover open={openMenu === "notifications"} onOpenChange={(open) => setMenuOpen("notifications", open)}>
        <PopoverTrigger
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label={t("notifications")}
        >
          <Bell className="size-5" />
          {notificationCenter.unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-4 font-bold text-primary-foreground ring-2 ring-background">
              {notificationCenter.unreadCount > 9 ? "9+" : notificationCenter.unreadCount}
            </span>
          )}
        </PopoverTrigger>
        <ViewerNotificationsMenu
          notifications={notificationCenter.notifications}
          unreadCount={notificationCenter.unreadCount}
          loading={notificationCenter.loading}
          loadingMore={notificationCenter.loadingMore}
          error={notificationCenter.error}
          loadMoreError={notificationCenter.loadMoreError}
          hasMore={notificationCenter.hasMore}
          onReload={notificationCenter.reload}
          onLoadMore={notificationCenter.loadMore}
          onRead={notificationCenter.markRead}
          onReadAll={notificationCenter.markAllRead}
          onHide={notificationCenter.hide}
          onMuteActor={notificationCenter.muteActor}
          onSelect={closeMenus}
        />
      </Popover>

      <Popover open={openMenu === "profile"} onOpenChange={(open) => setMenuOpen("profile", open)}>
        <PopoverTrigger
          type="button"
          aria-label={account("menu")}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ViewerAvatar className="size-8" user={session.user} />
        </PopoverTrigger>
        <ViewerProfileMenu user={session.user} onSelect={closeMenus} />
      </Popover>
    </div>
  )
}
