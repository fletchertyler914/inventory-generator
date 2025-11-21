import { memo, useCallback, useRef } from "react"
import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Checkbox } from "./ui/checkbox"
import { Badge } from "./ui/badge"
import { EditableCell } from "./table/EditableCell"
import { TableActions } from "./table/TableActions"
import { EmptyState } from "./ui/empty-state"
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip"
import { useTableSelection } from "@/hooks/useTableSelection"
import { cn } from "@/lib/utils"
import {
  updateInventoryItemField,
  type InventoryItem,
  type InventoryItemField,
} from "@/types/inventory"
import { FolderOpen } from "lucide-react"

interface InventoryTableProps {
  items: InventoryItem[]
  onItemsChange: (items: InventoryItem[]) => void
  onSelectionChange?: ((selectedIndices: number[]) => void) | undefined
  selectedIndices?: number[] | undefined
}

// Component to show tooltip when text is truncated
const TruncatedText = memo(function TruncatedText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  if (!text) {
    return <span className={cn("text-xs truncate block", className)}>{text}</span>
  }

  const content = (
    <span ref={ref} className={cn("text-xs truncate block", className)}>
      {text}
    </span>
  )

  // Always show tooltip if text exists (simpler and works better)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-md break-words whitespace-normal">{text}</p>
      </TooltipContent>
    </Tooltip>
  )
})

const TableRowMemo = memo(function TableRowMemo({
  item,
  index,
  isSelected,
  onToggle,
  onUpdate,
  style,
}: {
  item: InventoryItem
  index: number
  isSelected: boolean
  onToggle: () => void
  onUpdate: (field: InventoryItemField, value: string) => void
  style?: React.CSSProperties
}) {
  const handleSave = useCallback(
    (field: InventoryItemField) => (value: string) => {
      onUpdate(field, value)
    },
    [onUpdate]
  )

  return (
    <TableRow
      style={style}
      className={cn(
        "transition-colors duration-150",
        isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/30"
      )}
      data-state={isSelected ? "selected" : undefined}
      aria-selected={isSelected}
      role="row"
    >
      <TableCell role="gridcell" style={{ width: "40px", minWidth: "40px", maxWidth: "40px" }}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="h-3.5 w-3.5"
          aria-label={`Select row ${index + 1}: ${item.file_name}`}
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }}>
        <EditableCell
          value={item.date_rcvd}
          onSave={handleSave("date_rcvd")}
          placeholder="—"
          type="date"
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "80px", minWidth: "80px", maxWidth: "80px" }}>
        <EditableCell
          value={item.doc_year}
          onSave={handleSave("doc_year")}
          type="number"
          placeholder="—"
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "120px", minWidth: "120px", maxWidth: "120px" }}>
        <EditableCell
          value={item.doc_date_range}
          onSave={handleSave("doc_date_range")}
          placeholder="—"
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "140px", minWidth: "140px", maxWidth: "140px" }}>
        <TruncatedText
          text={item.document_type}
          className="font-semibold text-foreground"
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "200px", minWidth: "200px", maxWidth: "200px" }}>
        <TruncatedText
          text={item.document_description}
          className="text-foreground/90"
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "180px", minWidth: "180px", maxWidth: "180px" }}>
        <TruncatedText
          text={item.file_name}
          className="font-mono text-foreground/80"
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "120px", minWidth: "120px", maxWidth: "120px" }}>
        <TruncatedText
          text={item.folder_name}
          className="text-muted-foreground"
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "180px", minWidth: "180px", maxWidth: "180px" }}>
        <TruncatedText
          text={item.folder_path}
          className="text-muted-foreground/80 font-mono"
        />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "80px", minWidth: "80px", maxWidth: "80px" }}>
        {item.file_type ? (
          <Badge
            variant="outline"
            className="text-[10px] font-medium"
            aria-label={`File type: ${item.file_type}`}
          >
          {item.file_type}
        </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell role="gridcell" style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }}>
        <EditableCell value={item.bates_stamp} onSave={handleSave("bates_stamp")} placeholder="—" />
      </TableCell>
      <TableCell role="gridcell" style={{ width: "160px", minWidth: "160px", maxWidth: "160px" }}>
        <EditableCell value={item.notes} onSave={handleSave("notes")} placeholder="—" />
      </TableCell>
    </TableRow>
  )
})

/**
 * InventoryTable component with virtual scrolling for large datasets
 * 
 * Features:
 * - Virtual scrolling for 100+ items (improves performance)
 * - Row selection with keyboard and mouse support
 * - Inline editing of inventory fields
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * 
 * @param items - Array of inventory items to display
 * @param onItemsChange - Callback when items are updated
 * @param onSelectionChange - Optional callback when selection changes
 */
export function InventoryTable({
  items,
  onItemsChange,
  onSelectionChange,
  selectedIndices,
}: InventoryTableProps) {
  const {
    selectedRows,
    toggleRow,
    toggleAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    selectedCount,
    setSelectedRows,
  } = useTableSelection(items.length)

  // Use ref to track current selectedRows for comparison without causing re-renders
  const selectedRowsRef = React.useRef(selectedRows)
  React.useEffect(() => {
    selectedRowsRef.current = selectedRows
  }, [selectedRows])

  // Sync internal state with external selectedIndices prop
  React.useEffect(() => {
    if (selectedIndices !== undefined) {
      const externalSet = new Set(selectedIndices)
      // Only update if different to avoid unnecessary re-renders
      const currentArray = Array.from(selectedRowsRef.current).sort()
      const externalArray = Array.from(externalSet).sort()
      if (
        currentArray.length !== externalArray.length ||
        !currentArray.every((val, idx) => val === externalArray[idx])
      ) {
        setSelectedRows(externalSet)
      }
    }
  }, [selectedIndices, setSelectedRows])

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedRows))
    }
  }, [selectedRows, onSelectionChange])

  const handleUpdate = useCallback(
    (index: number, field: InventoryItemField, value: string) => {
      const updatedItems = [...items]
      const item = updatedItems[index]
      
      if (!item) return
      
      // Use type-safe update function
      updatedItems[index] = updateInventoryItemField(item, field, value)
      
      onItemsChange(updatedItems)
    },
    [items, onItemsChange]
  )

  const handleToggleRow = useCallback(
    (index: number) => {
      toggleRow(index)
    },
    [toggleRow]
  )

  // Virtual scrolling setup - only use for large datasets
  const parentRef = React.useRef<HTMLDivElement>(null)
  const tableRef = React.useRef<HTMLTableElement>(null)
  const shouldVirtualize = items.length > 100
  
  // Always create virtualizer but only use it when shouldVirtualize is true
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
    // Don't use enabled flag - always create it so it can measure
  })

  // Get virtual items - only use when shouldVirtualize is true
  const virtualItems = shouldVirtualize ? rowVirtualizer.getVirtualItems() : null

  // Get table width for virtual rows
  const [tableWidth, setTableWidth] = React.useState<number | undefined>(undefined)

  // Force virtualizer to measure when items change or container is ready
  React.useEffect(() => {
    if (shouldVirtualize && parentRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      const rafId = requestAnimationFrame(() => {
        rowVirtualizer.measure()
        // Measure table width for virtual rows
        if (tableRef.current) {
          setTableWidth(tableRef.current.scrollWidth)
        }
      })
      return () => cancelAnimationFrame(rafId)
    }
    return undefined
  }, [shouldVirtualize, items.length, rowVirtualizer])

  // Update table width on resize
  React.useEffect(() => {
    if (!shouldVirtualize) return

    const updateWidth = () => {
      if (tableRef.current) {
        setTableWidth(tableRef.current.scrollWidth)
      }
    }

    const resizeObserver = new ResizeObserver(updateWidth)
    if (tableRef.current) {
      resizeObserver.observe(tableRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [shouldVirtualize])

  return (
    <div 
      className={cn(
        "relative rounded border border-border bg-card overflow-hidden flex flex-col",
        shouldVirtualize ? "h-full" : "min-h-[400px]"
      )}
      role="region"
      aria-label="Inventory table"
      aria-rowcount={items.length}
      aria-colcount={12}
    >
      <div
        ref={parentRef}
        className={cn(
          "relative overflow-auto",
          shouldVirtualize ? "flex-1 min-h-0" : ""
        )}
        style={{ overflow: "auto" }}
      >
        <table
          ref={tableRef}
          className="caption-bottom text-sm table-fixed border-collapse min-w-[1400px] w-full"
          style={{ display: "table" }}
          role="grid"
          aria-label="Document inventory items"
        >
          <colgroup>
            <col className="w-[40px]" />
            <col className="w-[100px]" />
            <col className="w-[80px]" />
            <col className="w-[120px]" />
            <col className="w-[140px]" />
            <col className="w-[200px]" />
            <col className="w-[180px]" />
            <col className="w-[120px]" />
            <col className="w-[180px]" />
            <col className="w-[80px]" />
            <col className="w-[100px]" />
            <col className="w-[160px]" />
          </colgroup>
          <TableHeader
            className="sticky top-0 z-30 border-b border-border"
            role="rowgroup"
            style={{ 
              position: "sticky", 
              top: 0, 
              zIndex: 50,
              display: "table-header-group"
            }}
          >
            <TableRow 
              role="row" 
              className="bg-muted/95 backdrop-blur-sm sticky top-0 z-50"
              style={{ position: "sticky", top: 0, zIndex: 50 }}
            >
              <TableHead role="columnheader" scope="col" className="bg-muted/95">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                  className="h-3.5 w-3.5"
                  aria-describedby={isIndeterminate ? "selection-status" : undefined}
                />
              </TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Date Rcvd</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Doc Year</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Doc Date Range</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Document Type</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Document Description</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">File Name</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Folder Name</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Folder Path</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">File Type</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Bates Stamp</TableHead>
              <TableHead role="columnheader" scope="col" className="bg-muted/95">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody
            role="rowgroup"
            style={
              shouldVirtualize && virtualItems && virtualItems.length > 0
                ? {
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: tableWidth ? `${tableWidth}px` : "100%",
                    position: "relative",
                    display: "table-row-group",
                  }
                : undefined
            }
          >
            {items.length === 0 ? (
              <TableRow role="row">
                <TableCell colSpan={12} className="p-0" role="gridcell">
                  <div className="min-h-[300px] flex items-center justify-center">
                    <EmptyState
                      icon={FolderOpen}
                      title="No files found"
                      description="Select a folder to scan and generate your inventory."
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : shouldVirtualize && virtualItems && virtualItems.length > 0 ? (
              // Virtualized rendering for large datasets
              virtualItems.map((virtualRow) => {
                const item = items[virtualRow.index]
                if (!item) return null
                
                return (
                  <TableRowMemo
                    key={`${item.absolute_path}-${virtualRow.index}`}
                    item={item}
                    index={virtualRow.index}
                    isSelected={selectedRows.has(virtualRow.index)}
                    onToggle={() => handleToggleRow(virtualRow.index)}
                    onUpdate={(field, value) => handleUpdate(virtualRow.index, field, value)}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: tableWidth ? `${tableWidth}px` : "100%",
                      minWidth: tableWidth ? `${tableWidth}px` : "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  />
                )
              })
            ) : shouldVirtualize ? (
              // Fallback: if virtualizer is enabled but no items yet, show loading or empty
              <TableRow role="row">
                <TableCell colSpan={12} className="text-center py-8" role="gridcell">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                      Loading items...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Regular rendering for small datasets
              items.map((item, index) => (
                <TableRowMemo
                  key={`${item.absolute_path}-${index}`}
                  item={item}
                  index={index}
                  isSelected={selectedRows.has(index)}
                  onToggle={() => handleToggleRow(index)}
                  onUpdate={(field, value) => handleUpdate(index, field, value)}
                />
              ))
            )}
          </TableBody>
        </table>
      </div>
      {selectedCount > 0 && (
        <div id="selection-status" className="sr-only" aria-live="polite">
          {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
        </div>
      )}
      <TableActions selectedCount={selectedCount} onClearSelection={clearSelection} />
    </div>
  )
}
