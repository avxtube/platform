"use client"

import * as React from "react"
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"

import {
  Button,
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"

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
  const normalizedPage = clampPage(page, pageCount)
  const [pageInput, setPageInput] = React.useState({
    page: normalizedPage,
    value: String(normalizedPage),
  })
  const inputValue =
    pageInput.page === normalizedPage
      ? pageInput.value
      : String(normalizedPage)

  React.useEffect(() => {
    const nextPage = Number.parseInt(inputValue, 10)
    if (!Number.isFinite(nextPage)) return

    const timeout = window.setTimeout(() => {
      const targetPage = clampPage(nextPage, pageCount)
      if (inputValue !== String(targetPage))
        setPageInput({ page: normalizedPage, value: String(targetPage) })
      if (targetPage !== normalizedPage) onPageChange(targetPage)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [inputValue, normalizedPage, onPageChange, pageCount])

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
        disabled={normalizedPage <= 1}
        onClick={() => onPageChange(normalizedPage - 1)}
        aria-label="Previous page"
      >
        <ChevronsLeftIcon />
      </Button>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.max(1, pageCount)}
          value={inputValue}
          onChange={(event) =>
            setPageInput({ page: normalizedPage, value: event.target.value })
          }
          onBlur={() => {
            const nextPage = Number.parseInt(inputValue, 10)
            setPageInput({
              page: normalizedPage,
              value: String(
                Number.isFinite(nextPage)
                  ? clampPage(nextPage, pageCount)
                  : normalizedPage
              ),
            })
          }}
          aria-label="Current page"
          className="h-8 w-16 rounded-md border bg-background px-2 text-center text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          / {Math.max(1, pageCount)}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={normalizedPage >= pageCount}
        onClick={() => onPageChange(normalizedPage + 1)}
        aria-label="Next page"
      >
        <ChevronsRightIcon />
      </Button>
    </div>
  )
}

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(1, page), Math.max(1, pageCount))
}
