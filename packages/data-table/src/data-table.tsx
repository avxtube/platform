"use client"

import * as React from "react"
import {
  flexRender,
  type Row,
  type Table as TableInstance,
} from "@tanstack/react-table"

import {
  Checkbox,
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components"
import { cn } from "@workspace/ui/lib/utils"

export interface DataTableProps<TData> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children" | "contextMenu"
> {
  table: TableInstance<TData>
  selectable?: boolean
  empty?: React.ReactNode
  floatingBar?: (selectedRows: Row<TData>[]) => React.ReactNode
  rowProps?:
    | DataTableRowProps<TData>
    | ((row: Row<TData>) => DataTableRowProps<TData>)
  contextMenu?: React.ReactNode | ((row: Row<TData>) => React.ReactNode)
  renderExpandedRow?: (row: Row<TData>) => React.ReactNode
  expandOnRowClick?: boolean
  expandedRowClassName?: string
  expandedCellClassName?: string
}

export interface DataTableRowProps<TData> extends Omit<
  React.HTMLAttributes<HTMLTableRowElement>,
  "onClick" | "onDoubleClick"
> {
  onClick?: (
    row: Row<TData>,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => void
  onDoubleClick?: (
    row: Row<TData>,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => void
}

export function DataTable<TData>({
  table,
  selectable = false,
  empty = "Not found",
  floatingBar,
  rowProps,
  contextMenu,
  renderExpandedRow,
  expandOnRowClick = false,
  expandedRowClassName,
  expandedCellClassName,
  className,
  ...props
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows

  if (!rows.length) return <>{empty}</>

  return (
    <div className={cn("relative", className)} {...props}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {selectable ? (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={table.getIsAllPageRowsSelected()}
                      onCheckedChange={(checked) =>
                        table.toggleAllPageRowsSelected(Boolean(checked))
                      }
                      aria-label="Select all rows"
                    />
                  </TableHead>
                ) : null}
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    {...getColumnMeta(header.column.columnDef.meta).headProps}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <DataRow
                key={row.id}
                row={row}
                columnCount={
                  row.getVisibleCells().length + (selectable ? 1 : 0)
                }
                selectable={selectable}
                rowProps={
                  typeof rowProps === "function" ? rowProps(row) : rowProps
                }
                contextMenu={
                  typeof contextMenu === "function"
                    ? contextMenu(row)
                    : contextMenu
                }
                renderExpandedRow={renderExpandedRow}
                expandOnRowClick={expandOnRowClick}
                expandedRowClassName={expandedRowClassName}
                expandedCellClassName={expandedCellClassName}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {table.getFilteredSelectedRowModel().rows.length
        ? floatingBar?.(table.getFilteredSelectedRowModel().rows)
        : null}
    </div>
  )
}

function DataRow<TData>({
  row,
  columnCount,
  selectable,
  rowProps,
  contextMenu,
  renderExpandedRow,
  expandOnRowClick,
  expandedRowClassName,
  expandedCellClassName,
}: {
  row: Row<TData>
  columnCount: number
  selectable: boolean
  rowProps?: DataTableRowProps<TData>
  contextMenu?: React.ReactNode
  renderExpandedRow?: (row: Row<TData>) => React.ReactNode
  expandOnRowClick: boolean
  expandedRowClassName?: string
  expandedCellClassName?: string
}) {
  const { onClick, onDoubleClick, className, ...rest } = rowProps ?? {}
  const expandable = Boolean(renderExpandedRow) && row.getCanExpand()

  function handleClick(event: React.MouseEvent<HTMLTableRowElement>) {
    onClick?.(row, event)
    if (
      !event.defaultPrevented &&
      expandable &&
      expandOnRowClick &&
      !isInteractiveTarget(event.target)
    ) {
      row.toggleExpanded()
    }
  }

  const cells = (
    <>
      {selectable ? (
        <TableCell className="w-10">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
            aria-label="Select row"
          />
        </TableCell>
      ) : null}
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          {...getColumnMeta(cell.column.columnDef.meta).cellProps}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </>
  )
  const mainRowProps = {
    ...rest,
    "data-row-id": row.id,
    "data-state": row.getIsSelected() ? "selected" : undefined,
    "aria-expanded": expandable ? row.getIsExpanded() : undefined,
    onClick: handleClick,
    onDoubleClick: onDoubleClick
      ? (event) => onDoubleClick(row, event)
      : undefined,
    className: cn(
      expandable && expandOnRowClick && "cursor-pointer",
      className
    ),
  } as React.ComponentProps<typeof TableRow>
  const mainRow = contextMenu ? (
    <ContextMenu>
      <ContextMenuTrigger render={<TableRow {...mainRowProps} />}>
        {cells}
      </ContextMenuTrigger>
      <ContextMenuContent>{contextMenu}</ContextMenuContent>
    </ContextMenu>
  ) : (
    <TableRow {...mainRowProps}>{cells}</TableRow>
  )

  return (
    <>
      {mainRow}
      {expandable && row.getIsExpanded() ? (
        <TableRow
          className={cn("bg-muted/30 hover:bg-muted/30", expandedRowClassName)}
        >
          <TableCell
            colSpan={columnCount}
            className={cn("p-4", expandedCellClassName)}
          >
            {renderExpandedRow?.(row)}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

function getColumnMeta(meta: unknown) {
  return (meta ?? {}) as {
    headProps?: React.ThHTMLAttributes<HTMLTableCellElement>
    cellProps?: React.TdHTMLAttributes<HTMLTableCellElement>
  }
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a,button,input,select,textarea,[role=button],[data-no-row-expand]"
      )
    )
  )
}
