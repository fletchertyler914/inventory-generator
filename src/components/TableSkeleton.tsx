import { Skeleton } from "./ui/skeleton"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

export function TableSkeleton({ rowCount = 10 }: { rowCount?: number }) {
  return (
    <div className="relative rounded border border-border bg-card overflow-hidden h-full flex flex-col">
      <div className="flex-1 overflow-auto relative">
        <table className="w-full caption-bottom text-sm table-auto" role="grid">
          <colgroup>
            <col className="w-[2%] min-w-[40px]" />
            <col className="w-[6%] min-w-[80px]" />
            <col className="w-[5%] min-w-[60px]" />
            <col className="w-[7%] min-w-[100px]" />
            <col className="w-[10%] min-w-[120px]" />
            <col className="w-[15%] min-w-[150px]" />
            <col className="w-[14%] min-w-[140px]" />
            <col className="w-[8%] min-w-[100px]" />
            <col className="w-[12%] min-w-[120px]" />
            <col className="w-[5%] min-w-[60px]" />
            <col className="w-[6%] min-w-[80px]" />
            <col className="w-[10%] min-w-[120px]" />
          </colgroup>
          <TableHeader className="sticky top-0 z-20 bg-muted/95 backdrop-blur-sm border-b border-border" role="rowgroup">
            <TableRow role="row">
              <TableHead className="w-[2%] min-w-[40px]" role="columnheader" scope="col">
                <Skeleton className="h-3.5 w-3.5" />
              </TableHead>
              <TableHead className="w-[6%] min-w-[80px]" role="columnheader" scope="col">Date Rcvd</TableHead>
              <TableHead className="w-[5%] min-w-[60px]" role="columnheader" scope="col">Doc Year</TableHead>
              <TableHead className="w-[7%] min-w-[100px]" role="columnheader" scope="col">Doc Date Range</TableHead>
              <TableHead className="w-[10%] min-w-[120px]" role="columnheader" scope="col">Document Type</TableHead>
              <TableHead className="w-[15%] min-w-[150px]" role="columnheader" scope="col">Document Description</TableHead>
              <TableHead className="w-[14%] min-w-[140px]" role="columnheader" scope="col">File Name</TableHead>
              <TableHead className="w-[8%] min-w-[100px]" role="columnheader" scope="col">Folder Name</TableHead>
              <TableHead className="w-[12%] min-w-[120px]" role="columnheader" scope="col">Folder Path</TableHead>
              <TableHead className="w-[5%] min-w-[60px]" role="columnheader" scope="col">File Type</TableHead>
              <TableHead className="w-[6%] min-w-[80px]" role="columnheader" scope="col">Bates Stamp</TableHead>
              <TableHead className="w-[10%] min-w-[120px]" role="columnheader" scope="col">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody role="rowgroup">
            {Array.from({ length: rowCount }).map((_, index) => (
              <TableRow key={index} role="row">
                <TableCell className="w-[2%] min-w-[40px]" role="gridcell">
                  <Skeleton className="h-3.5 w-3.5" />
                </TableCell>
                <TableCell className="w-[6%] min-w-[80px]" role="gridcell">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="w-[5%] min-w-[60px]" role="gridcell">
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell className="w-[7%] min-w-[100px]" role="gridcell">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="w-[10%] min-w-[120px]" role="gridcell">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="w-[15%] min-w-[150px]" role="gridcell">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="w-[14%] min-w-[140px]" role="gridcell">
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="w-[8%] min-w-[100px]" role="gridcell">
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell className="w-[12%] min-w-[120px]" role="gridcell">
                  <Skeleton className="h-4 w-36" />
                </TableCell>
                <TableCell className="w-[5%] min-w-[60px]" role="gridcell">
                  <Skeleton className="h-5 w-12" />
                </TableCell>
                <TableCell className="w-[6%] min-w-[80px]" role="gridcell">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="w-[10%] min-w-[120px]" role="gridcell">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}

