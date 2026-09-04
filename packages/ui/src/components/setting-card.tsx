import type * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Skeleton } from "./skeleton"

export function SettingCard({
  title,
  description,
  footer,
  children,
  variant = "default",
  className,
  headerClassName,
}: {
  title?: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
  variant?: "default" | "destructive"
  className?: string
  headerClassName?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        variant === "destructive"
          ? "border-destructive/30"
          : "border-border"
      )}
    >
      <div className={cn("space-y-4 p-6", className)}>
        {title || description ? (
          <div className={headerClassName}>
            {title ? (
              <h3
                className={cn(
                  "text-base font-semibold",
                  variant === "destructive"
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
      {footer ? (
        <div
          className={cn(
            "flex items-center justify-between border-t px-6 py-3.5",
            variant === "destructive"
              ? "border-destructive/20 bg-destructive/5"
              : "border-border bg-muted/30"
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export function SettingCardSkeleton({
  hasFooter = true,
  lines = 1,
}: {
  hasFooter?: boolean
  lines?: number
} = {}) {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border bg-card">
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton key={index} className="h-9 max-w-md rounded-md" />
          ))}
        </div>
      </div>
      {hasFooter ? (
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3.5">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      ) : null}
    </div>
  )
}
