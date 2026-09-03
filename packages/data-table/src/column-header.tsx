"use client"

import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  EyeOffIcon,
} from "lucide-react"
import type { Column } from "@tanstack/react-table"

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>
  title: React.ReactNode
  className?: string
}) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={className}>{title}</div>
  }

  const sorted = column.getIsSorted()
  return (
    <div className={cn("flex items-center", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between gap-3"
            />
          }
        >
          <span>{title}</span>
          {sorted === "desc" ? (
            <ArrowDownIcon />
          ) : sorted === "asc" ? (
            <ArrowUpIcon />
          ) : (
            <ArrowUpDownIcon />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {column.getCanSort() ? (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowUpIcon /> Ascending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDownIcon /> Descending
              </DropdownMenuItem>
            </>
          ) : null}
          {column.getCanSort() && column.getCanHide() ? (
            <DropdownMenuSeparator />
          ) : null}
          {column.getCanHide() ? (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOffIcon /> Hide column
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
