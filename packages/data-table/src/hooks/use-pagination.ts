"use client"

import * as React from "react"

import { useUncontrolled } from "./use-uncontrolled"

export const PAGINATION_DOTS = "dots" as const
export type PaginationItem = number | typeof PAGINATION_DOTS

export interface UsePaginationOptions {
  total: number
  page?: number
  initialPage?: number
  siblings?: number
  boundaries?: number
  onChange?: (page: number) => void
}

export function usePagination({
  total,
  page,
  initialPage = 1,
  siblings = 1,
  boundaries = 1,
  onChange,
}: UsePaginationOptions) {
  const pageTotal = Math.max(0, Math.trunc(total))
  const [active, setActive] = useUncontrolled({
    value: page,
    defaultValue: initialPage,
    finalValue: 1,
    onChange,
  })
  const safeActive = pageTotal ? clamp(active, 1, pageTotal) : 1

  const setPage = React.useCallback(
    (nextPage: number) =>
      setActive(clamp(Math.trunc(nextPage), 1, Math.max(1, pageTotal))),
    [pageTotal, setActive]
  )

  const range = React.useMemo<PaginationItem[]>(() => {
    if (!pageTotal) return []
    const visibleSlots = siblings * 2 + boundaries * 2 + 3
    if (pageTotal <= visibleSlots) return numberRange(1, pageTotal)

    const left = Math.max(safeActive - siblings, boundaries + 1)
    const right = Math.min(safeActive + siblings, pageTotal - boundaries)
    const showLeftDots = left > boundaries + 1
    const showRightDots = right < pageTotal - boundaries

    return [
      ...numberRange(1, boundaries),
      ...(showLeftDots
        ? [PAGINATION_DOTS]
        : numberRange(boundaries + 1, left - 1)),
      ...numberRange(left, right),
      ...(showRightDots
        ? [PAGINATION_DOTS]
        : numberRange(right + 1, pageTotal - boundaries)),
      ...numberRange(pageTotal - boundaries + 1, pageTotal),
    ]
  }, [boundaries, pageTotal, safeActive, siblings])

  return {
    range,
    active: safeActive,
    setPage,
    first: 1,
    last: pageTotal,
    previous: Math.max(1, safeActive - 1),
    next: Math.min(Math.max(1, pageTotal), safeActive + 1),
    total: pageTotal,
    hasPrevious: safeActive > 1,
    hasNext: safeActive < pageTotal,
  }
}

export function calculateTotalPages(totalItems: number, pageSize: number) {
  return pageSize > 0 ? Math.ceil(Math.max(0, totalItems) / pageSize) : 0
}

export function getPageBounds(
  page: number,
  pageSize: number,
  totalItems: number
) {
  if (totalItems <= 0 || pageSize <= 0) return { start: 0, end: 0 }
  const start = (Math.max(1, page) - 1) * pageSize + 1
  return { start, end: Math.min(start + pageSize - 1, totalItems) }
}

function numberRange(start: number, end: number) {
  if (start > end) return []
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
