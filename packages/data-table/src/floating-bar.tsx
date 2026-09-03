"use client"

import { XIcon } from "lucide-react"
import type { Table } from "@tanstack/react-table"

import { Button, Separator } from "@workspace/ui/components"

export function DataTableFloatingBar<TData>({
  table,
  children,
  selectedLabel,
}: {
  table: Table<TData>
  children?: React.ReactNode
  selectedLabel?: (count: number) => React.ReactNode
}) {
  const count = table.getFilteredSelectedRowModel().rows.length
  if (!count) return null

  return (
    <div className="sticky bottom-4 z-40 mx-auto mt-3 flex w-fit items-center gap-2 rounded-lg border bg-card p-2 shadow-2xl">
      <span className="px-1 text-xs">
        {selectedLabel?.(count) ?? `${count} selected`}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => table.resetRowSelection()}
        aria-label="Clear selection"
      >
        <XIcon />
      </Button>
      {children ? <Separator orientation="vertical" className="h-5" /> : null}
      {children}
    </div>
  )
}
