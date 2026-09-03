import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components"

export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  className,
}: {
  columnCount: number
  rowCount?: number
  className?: string
}) {
  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: columnCount }, (_, index) => (
              <TableHead key={index}>
                <Skeleton className="h-6 w-full" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }, (_, row) => (
            <TableRow key={row} className="hover:bg-transparent">
              {Array.from({ length: columnCount }, (_, column) => (
                <TableCell key={column}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
