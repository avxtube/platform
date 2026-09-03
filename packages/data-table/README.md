# @workspace/data-table

Reusable TanStack Table components and state hooks. Routing and data fetching stay
in the consuming application, so the package can be shared by Admin and other apps.

## Expandable rows

```tsx
const { table } = useTable({
  data,
  columns,
  getRowCanExpand: (row) => Boolean(row.original.timeline),
})

return (
  <DataTable
    table={table}
    expandOnRowClick
    renderExpandedRow={(row) => (
      <JobTimeline timeline={row.original.timeline} />
    )}
  />
)
```

Use `DataTableExpandButton` in a column when expansion should only happen from an
explicit button. TanStack's `table.toggleAllRowsExpanded(true | false)` can be used
for Expand all and Collapse all actions.

## Included exports

- `DataTable`, `DataTableColumnHeader`, and `DataTableExpandButton`
- `DataTablePager`, `DataTableSkeleton`, and `DataTableFloatingBar`
- `useTable`, `usePagination`, and `useUncontrolled`
- Common TanStack Table types and `createColumnHelper`
