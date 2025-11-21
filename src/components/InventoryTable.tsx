import { memo, useCallback } from "react"
import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { Checkbox } from "./ui/checkbox"
import { Badge } from "./ui/badge"
import { EditableCell } from "./table/EditableCell"
import { TableActions } from "./table/TableActions"
import { useTableSelection } from "@/hooks/useTableSelection"
import { cn } from "@/lib/utils"
import { updateInventoryItemField, type InventoryItem, type InventoryItemField } from "@/types/inventory"

interface InventoryTableProps {
  items: InventoryItem[]
  onItemsChange: (items: InventoryItem[]) => void
  onSelectionChange?: ((selectedIndices: number[]) => void) | undefined
  selectedIndices?: number[] | undefined
}

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
      <TableCell className="w-[2%] min-w-[40px]" role="gridcell">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="h-3.5 w-3.5"
          aria-label={`Select row ${index + 1}: ${item.file_name}`}
        />
      </TableCell>
      <TableCell className="w-[6%] min-w-[80px]" role="gridcell">
        <EditableCell
          value={item.date_rcvd}
          onSave={handleSave("date_rcvd")}
          placeholder="—"
          type="date"
        />
      </TableCell>
      <TableCell className="w-[5%] min-w-[60px]" role="gridcell">
        <EditableCell
          value={item.doc_year}
          onSave={handleSave("doc_year")}
          type="number"
          placeholder="—"
        />
      </TableCell>
      <TableCell className="w-[7%] min-w-[100px]" role="gridcell">
        <EditableCell
          value={item.doc_date_range}
          onSave={handleSave("doc_date_range")}
          placeholder="—"
        />
      </TableCell>
      <TableCell className="w-[10%] min-w-[120px]" role="gridcell">
        <span className="text-xs font-semibold text-foreground">
          {item.document_type}
        </span>
      </TableCell>
      <TableCell className="w-[15%] min-w-[150px]" role="gridcell">
        <span className="text-xs text-foreground/90 truncate block" title={item.document_description}>
          {item.document_description}
        </span>
      </TableCell>
      <TableCell className="w-[14%] min-w-[140px]" role="gridcell">
        <span className="text-xs font-mono text-foreground/80 truncate block" title={item.file_name}>
          {item.file_name}
        </span>
      </TableCell>
      <TableCell className="w-[8%] min-w-[100px]" role="gridcell">
        <span className="text-xs text-muted-foreground truncate block" title={item.folder_name}>
          {item.folder_name}
        </span>
      </TableCell>
      <TableCell className="w-[12%] min-w-[120px]" role="gridcell">
        <span className="text-xs text-muted-foreground/80 font-mono truncate block" title={item.folder_path}>
          {item.folder_path}
        </span>
      </TableCell>
      <TableCell className="w-[5%] min-w-[60px]" role="gridcell">
        <Badge variant="outline" className="text-[10px] font-medium" aria-label={`File type: ${item.file_type}`}>
          {item.file_type}
        </Badge>
      </TableCell>
      <TableCell className="w-[6%] min-w-[80px]" role="gridcell">
        <EditableCell
          value={item.bates_stamp}
          onSave={handleSave("bates_stamp")}
          placeholder="—"
        />
      </TableCell>
      <TableCell className="w-[10%] min-w-[120px]" role="gridcell">
        <EditableCell
          value={item.notes}
          onSave={handleSave("notes")}
          placeholder="—"
        />
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
export function InventoryTable({ items, onItemsChange, onSelectionChange, selectedIndices }: InventoryTableProps) {
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
      if (currentArray.length !== externalArray.length || 
          !currentArray.every((val, idx) => val === externalArray[idx])) {
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

  // Force virtualizer to measure when items change or container is ready
  React.useEffect(() => {
    if (shouldVirtualize && parentRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      const rafId = requestAnimationFrame(() => {
        rowVirtualizer.measure()
      })
      return () => cancelAnimationFrame(rafId)
    }
    return undefined
  }, [shouldVirtualize, items.length, rowVirtualizer])

  return (
    <div 
      className="relative rounded border border-border bg-card overflow-hidden h-full flex flex-col"
      role="region"
      aria-label="Inventory table"
      aria-rowcount={items.length}
      aria-colcount={12}
    >
      <div ref={parentRef} className="flex-1 overflow-auto relative">
        <table className="w-full caption-bottom text-sm table-auto border-collapse" role="grid" aria-label="Document inventory items">
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
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                  className="h-3.5 w-3.5"
                  aria-describedby={isIndeterminate ? "selection-status" : undefined}
                />
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
          <TableBody
            role="rowgroup"
            style={
              shouldVirtualize && virtualItems && virtualItems.length > 0
                ? {
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                  }
                : undefined
            }
          >
            {items.length === 0 ? (
              <TableRow role="row">
                <TableCell colSpan={12} className="text-center py-8" role="gridcell">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                      No files found. Select a folder to scan.
                    </p>
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
                      width: "100%",
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
      <TableActions
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
      />
    </div>
  )
}
