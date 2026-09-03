"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from "@tanstack/react-table"

type IdentifiableRow = { id: string | number } | { _id: string | number }

export interface UseTableOptions<TData, TValue> {
  data: TData[]
  columns: ColumnDef<TData, TValue>[]
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: (state: PaginationState) => void
  sorting?: SortingState
  initialSorting?: SortingState
  onSortingChange?: (state: SortingState) => void
  rowSelection?: RowSelectionState
  onRowSelectionChange?: (state: RowSelectionState) => void
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (state: VisibilityState) => void
  expanded?: ExpandedState
  initialExpanded?: ExpandedState
  onExpandedChange?: (state: ExpandedState) => void
  getRowId?: (row: TData, index: number) => string
  getRowCanExpand?: (row: Row<TData>) => boolean
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  manualPagination?: boolean
  manualSorting?: boolean
  manualFiltering?: boolean
}

export function useTable<TData, TValue>({
  data,
  columns,
  pageCount,
  pagination,
  onPaginationChange,
  sorting,
  initialSorting = [],
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
  expanded,
  initialExpanded = {},
  onExpandedChange,
  getRowId,
  getRowCanExpand,
  enableRowSelection = false,
  manualPagination = true,
  manualSorting = true,
  manualFiltering = true,
}: UseTableOptions<TData, TValue>) {
  const [localPagination, setLocalPagination] = React.useState<PaginationState>(
    pagination ?? { pageIndex: 0, pageSize: 10 }
  )
  const [localSorting, setLocalSorting] = React.useState(initialSorting)
  const [localSelection, setLocalSelection] = React.useState<RowSelectionState>(
    {}
  )
  const [localVisibility, setLocalVisibility] = React.useState<VisibilityState>(
    {}
  )
  const [localExpanded, setLocalExpanded] =
    React.useState<ExpandedState>(initialExpanded)

  const resolvedPagination = pagination ?? localPagination
  const resolvedSorting = sorting ?? localSorting
  const resolvedSelection = rowSelection ?? localSelection
  const resolvedVisibility = columnVisibility ?? localVisibility
  const resolvedExpanded = expanded ?? localExpanded

  const updatePagination = createStateUpdater(
    resolvedPagination,
    setLocalPagination,
    pagination !== undefined,
    onPaginationChange
  )
  const updateSorting = createStateUpdater(
    resolvedSorting,
    setLocalSorting,
    sorting !== undefined,
    onSortingChange
  )
  const updateSelection = createStateUpdater(
    resolvedSelection,
    setLocalSelection,
    rowSelection !== undefined,
    onRowSelectionChange
  )
  const updateVisibility = createStateUpdater(
    resolvedVisibility,
    setLocalVisibility,
    columnVisibility !== undefined,
    onColumnVisibilityChange
  )
  const updateExpanded = createStateUpdater(
    resolvedExpanded,
    setLocalExpanded,
    expanded !== undefined,
    onExpandedChange
  )

  // TanStack Table intentionally returns mutable callbacks; consumers should not
  // pass the table instance through React Compiler memoization boundaries.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    getRowId: getRowId ?? defaultRowId,
    getRowCanExpand,
    enableRowSelection,
    state: {
      pagination: resolvedPagination,
      sorting: resolvedSorting,
      rowSelection: resolvedSelection,
      columnVisibility: resolvedVisibility,
      expanded: resolvedExpanded,
    },
    onPaginationChange: updatePagination,
    onSortingChange: updateSorting,
    onRowSelectionChange: updateSelection,
    onColumnVisibilityChange: updateVisibility,
    onExpandedChange: updateExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination,
    manualSorting,
    manualFiltering,
  })

  React.useEffect(() => {
    table.resetRowSelection()
  }, [resolvedPagination.pageIndex, resolvedPagination.pageSize, table])

  return { table }
}

function createStateUpdater<T>(
  current: T,
  setLocal: React.Dispatch<React.SetStateAction<T>>,
  controlled: boolean,
  onChange?: (state: T) => void
): OnChangeFn<T> {
  return (updater: Updater<T>) => {
    const next =
      typeof updater === "function"
        ? (updater as (previous: T) => T)(current)
        : updater
    if (!controlled) setLocal(next)
    onChange?.(next)
  }
}

function defaultRowId<TData>(row: TData, index: number) {
  if (row && typeof row === "object") {
    const identifiable = row as unknown as IdentifiableRow
    if ("_id" in identifiable) return String(identifiable._id)
    if ("id" in identifiable) return String(identifiable.id)
  }
  return String(index)
}
