"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import {
  Button,
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"

import { PAGINATION_DOTS, usePagination } from "./hooks/use-pagination"

export function DataTablePager({
  page,
  pageCount,
  pageSize,
  pageSizes = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
}: {
  page: number
  pageCount: number
  pageSize: number
  pageSizes?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  className?: string
}) {
  const pagination = usePagination({
    total: pageCount,
    page,
    onChange: onPageChange,
  })

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-3 py-3",
        className
      )}
    >
      {onPageSizeChange ? (
        <NativeSelect
          aria-label="Rows per page"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="w-20"
        >
          {pageSizes.map((size) => (
            <NativeSelectOption key={size} value={String(size)}>
              {size}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!pagination.hasPrevious}
        onClick={() => pagination.setPage(pagination.previous)}
        aria-label="Previous page"
      >
        <ChevronLeftIcon />
      </Button>
      <div className="flex items-center gap-1">
        {pagination.range.map((item, index) =>
          item === PAGINATION_DOTS ? (
            <span
              key={`dots-${index}`}
              className="grid size-8 place-items-center text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === pagination.active ? "outline" : "ghost"}
              size="icon-sm"
              aria-current={item === pagination.active ? "page" : undefined}
              onClick={() => pagination.setPage(item)}
            >
              {item}
            </Button>
          )
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={!pagination.hasNext}
        onClick={() => pagination.setPage(pagination.next)}
        aria-label="Next page"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  )
}
