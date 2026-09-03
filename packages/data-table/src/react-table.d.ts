import "@tanstack/react-table"
import type React from "react"

declare module "@tanstack/react-table" {
  // Generic parameters must match TanStack's declaration for module augmentation.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<_TData, _TValue> {
    headProps?: React.ThHTMLAttributes<HTMLTableCellElement>
    cellProps?: React.TdHTMLAttributes<HTMLTableCellElement>
  }
}
