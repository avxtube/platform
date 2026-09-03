"use client"

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import type { Row } from "@tanstack/react-table"

import { Button } from "@workspace/ui/components"

export function DataTableExpandButton<TData>({
  row,
  expandLabel = "Expand row",
  collapseLabel = "Collapse row",
}: {
  row: Row<TData>
  expandLabel?: string
  collapseLabel?: string
}) {
  if (!row.getCanExpand()) return null
  const expanded = row.getIsExpanded()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      data-no-row-expand
      aria-expanded={expanded}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={() => row.toggleExpanded()}
    >
      {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
    </Button>
  )
}
