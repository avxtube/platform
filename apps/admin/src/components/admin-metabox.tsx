"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"

export function AdminMetabox({
  title,
  description,
  children,
  defaultOpen = true,
  contentClassName,
}: {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  contentClassName?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <Card size="sm" className="gap-0 rounded-lg py-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left hover:bg-muted/30"
        >
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
            {description ? <span className="mt-0.5 block truncate text-xs text-muted-foreground/70">{description}</span> : null}
          </span>
          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div hidden={!open}>
          <CardContent className={cn("py-4", contentClassName)}>{children}</CardContent>
        </div>
    </Card>
  )
}
