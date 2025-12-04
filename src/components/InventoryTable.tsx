import { memo, useCallback, useState, useEffect } from "react"
import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Checkbox } from "./ui/checkbox"
import { TableActions } from "./table/TableActions"
import { EmptyState } from "./ui/empty-state"
import { useTableSelection } from "@/hooks/useTableSelection"
import { cn } from "@/lib/utils"
import {
  updateInventoryItemField,
  type InventoryItem,
  type InventoryItemField,
  type FileStatus,
} from "@/types/inventory"
import { FolderOpen, AlertTriangle } from "lucide-react"
import type { TableColumnConfig, TableColumn } from "@/types/tableColumns"
import { getColumnConfig } from "@/types/tableColumns"
import { ColumnCellRenderer } from "./table/ColumnCellRenderer"
import { fileService } from "@/services/fileService"
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip"

type TableFilter = "unreviewed" | "in_progress" | "reviewed" | "flagged" | "finalized" | "all"

interface InventoryTableProps {
  items: InventoryItem[]
  onItemsChange: (items: InventoryItem[]) => void
  onSelectionChange?: ((selectedIndices: number[]) => void) | undefined
  selectedIndices?: number[] | undefined
  onFileOpen?: ((filePath: string) => void) | undefined
  columnConfig?: TableColumnConfig
  statusFilter?: TableFilter
  onStatusFilterChange?: (filter: TableFilter) => void
  totalFiles?: number
  caseId?: string
}

const TableRowMemo = memo(function TableRowMemo({
  item,
  index,
  isSelected,
  onToggle,
  onUpdate,
  onFileOpen,
  style,
  columns,
  getColumnWidth,
  fileChanged,
}: {
  item: InventoryItem
  index: number
  isSelected: boolean
  onToggle: () => void
  onUpdate: (field: InventoryItemField, value: string | FileStatus | string[]) => void
  onFileOpen?: ((filePath: string) => void) | undefined
  style?: React.CSSProperties | undefined
  columns: TableColumn[]
  getColumnWidth: (columnId: string) => React.CSSProperties
  fileChanged?: boolean
}) {
  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>) => {
      // Don't open file if clicking on checkbox or editable cell (they stop propagation)
      const target = e.target as HTMLElement
      if (
        target.closest('input[type="checkbox"]') ||
        target.closest("[data-editable-cell]") ||
        target.closest("[data-tags-cell]") ||
        target.closest("button") ||
        target.closest('[role="dialog"]') ||
        target.closest("[data-radix-portal]")
      ) {
        return
      }

      // Open file on row click
      if (onFileOpen && item.absolute_path) {
        onFileOpen(item.absolute_path)
      }
    },
    [item.absolute_path, onFileOpen]
  )

  return (
    <TableRow
      style={style}
      className={cn(
        "transition-all duration-200 ease-in-out",
        isSelected ? "bg-primary/10 hover:bg-primary/15 shadow-sm" : "hover:bg-muted/30",
        onFileOpen && item.absolute_path && "cursor-pointer"
      )}
      data-state={isSelected ? "selected" : undefined}
      aria-selected={isSelected}
      role="row"
      onClick={handleRowClick}
    >
      {/* Selection checkbox - always first */}
      <TableCell role="gridcell" style={{ width: "40px", minWidth: "40px", maxWidth: "40px" }}>
        <div className="flex items-center gap-1.5">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="h-3.5 w-3.5"
          aria-label={`Select row ${index + 1}: ${item.file_name}`}
        />
          {fileChanged && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p>File has been modified</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>

      {/* Dynamic columns */}
      {columns.map((column) => (
        <TableCell key={column.id} role="gridcell" style={getColumnWidth(column.id)}>
          <ColumnCellRenderer column={column} item={item} onUpdate={onUpdate} />
        </TableCell>
      ))}
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
// Separate component for virtualized table to isolate useVirtualizer hook
// This prevents React Compiler caching issues by ensuring the hook is always called
// in the same component context when virtualization is enabled
/**
 * ELITE: Virtualized table body with optimized rendering
 * Isolated component to prevent React Compiler issues with useVirtualizer
 */
const VirtualizedTableBody = memo(function VirtualizedTableBody({
  items,
  selectedRows,
  handleToggleRow,
  handleUpdate,
  onFileOpen,
  parentRef,
  tableRef,
  setTableWidth,
  columns,
  getColumnWidth,
  changedFiles,
}: {
  items: InventoryItem[]
  selectedRows: Set<number>
  handleToggleRow: (index: number) => void
  handleUpdate: (
    index: number,
    field: InventoryItemField,
    value: string | FileStatus | string[]
  ) => void
  onFileOpen?: ((filePath: string) => void) | undefined
  parentRef: React.RefObject<HTMLDivElement>
  tableRef: React.RefObject<HTMLTableElement>
  setTableWidth: React.Dispatch<React.SetStateAction<number | undefined>>
  columns: TableColumn[]
  getColumnWidth: (columnId: string) => React.CSSProperties
  changedFiles: Set<string>
}) {
  // useVirtualizer hook must be called unconditionally in this component
  // This component only renders when virtualization is needed, so the hook is always called
  // This isolates the hook from React Compiler caching issues
  // ELITE: Optimized virtual scrolling for 10k+ files
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Fixed row height for optimal performance
    overscan: 5, // Reduced overscan for better performance with large datasets (10k+)
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  // Measure width on mount and when items change
  React.useEffect(() => {
    const updateWidth = () => {
      if (tableRef.current) {
        setTableWidth(tableRef.current.scrollWidth)
      }
    }

    if (!parentRef.current) {
      return undefined
    }

    const rafId = requestAnimationFrame(() => {
      rowVirtualizer.measure()
      updateWidth()
    })

    // Set up ResizeObserver for width changes
    const resizeObserver = new ResizeObserver(updateWidth)
    if (tableRef.current) {
      resizeObserver.observe(tableRef.current)
    }

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
    }
  }, [items.length, rowVirtualizer, tableRef, setTableWidth, parentRef])

  return (
    <>
      {virtualItems.map((virtualRow) => {
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
            onFileOpen={onFileOpen}
            columns={columns}
            getColumnWidth={getColumnWidth}
            fileChanged={changedFiles.has(item.id || item.absolute_path)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              minWidth: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        )
      })}
      {/* Spacer to maintain total height for scrolling */}
      <tr
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          display: "block",
          visibility: "hidden",
        }}
        aria-hidden="true"
      />
    </>
  )
})

export function InventoryTable({
  items,
  onItemsChange,
  onSelectionChange,
  selectedIndices,
  onFileOpen,
  columnConfig,
  statusFilter = "all",
  onStatusFilterChange,
  totalFiles,
  caseId,
}: InventoryTableProps) {
  // Track which files have changed
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set())

  // ELITE: Check file changes for visible items (debounced)
  useEffect(() => {
    if (!caseId || items.length === 0) {
      setChangedFiles(new Set())
      return
    }

    const checkFileChanges = async () => {
      const changed = new Set<string>()
      const checkPromises: Promise<void>[] = []

      // Check up to 50 visible items at a time (performance optimization)
      const itemsToCheck = items.slice(0, 50).filter((item) => item.id)

      for (const item of itemsToCheck) {
        if (!item.id) continue

        const promise = fileService
          .checkFileChanged(item.id)
          .then((status) => {
            if (status.changed) {
              changed.add(item.id || item.absolute_path)
            }
          })
          .catch(() => {
            // Ignore errors for individual file checks
          })

        checkPromises.push(promise)
      }

      await Promise.all(checkPromises)
      setChangedFiles(changed)
    }

    // Debounce checks - only check every 30 seconds
    const timeoutId = setTimeout(checkFileChanges, 30000)

    // Check immediately on mount
    checkFileChanges()

    return () => clearTimeout(timeoutId)
  }, [items, caseId])

  // ELITE: Optimized column config processing
  // Use stable dependency to prevent unnecessary recalculations
  const config = columnConfig || getColumnConfig()

  // ELITE: Memoize visible columns - only recalculate when columns actually change
  const visibleColumns = React.useMemo(() => {
    return config.columns.filter((col) => col.visible).sort((a, b) => a.order - b.order)
  }, [config.columns])

  // ELITE: Pre-compute column widths once, reuse everywhere
  // This eliminates object creation and lookups on every render
  const columnWidths = React.useMemo(() => {
    const defaultWidths = new Map<string, number>([
      ["date_rcvd", 100],
      ["doc_year", 80],
      ["doc_date_range", 120],
      ["document_type", 140],
      ["document_description", 200],
      ["file_name", 180],
      ["folder_name", 120],
      ["folder_path", 180],
      ["file_type", 80],
      ["file_size", 100],
      ["bates_stamp", 100],
      ["status", 120],
      ["tags", 140],
      ["notes", 160],
      ["created_at", 120],
      ["modified_at", 120],
    ])

    const widths = new Map<string, number>()
    visibleColumns.forEach((col: TableColumn) => {
      widths.set(col.id, col.width || defaultWidths.get(col.id) || 120)
    })
    return widths
  }, [visibleColumns])

  // ELITE: Memoized width getter - returns pre-computed style object
  const getColumnWidth = React.useCallback(
    (columnId: string): React.CSSProperties => {
      const width = columnWidths.get(columnId) || 120
      // Reuse same object structure to minimize allocations
      return {
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
      }
    },
    [columnWidths]
  )

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

  // Sync internal state with external selectedIndices prop - optimized with Set comparison
  React.useEffect(() => {
    if (selectedIndices !== undefined) {
      const externalSet = new Set(selectedIndices)
      const currentSet = selectedRowsRef.current

      // Use Set comparison instead of array sorting
      if (
        currentSet.size !== externalSet.size ||
        !Array.from(currentSet).every((val) => externalSet.has(val))
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

  // Optimize handleUpdate - use items ref to avoid dependency
  const itemsRef = React.useRef(items)
  React.useEffect(() => {
    itemsRef.current = items
  }, [items])

  const handleUpdate = useCallback(
    (index: number, field: InventoryItemField, value: string | FileStatus | string[]) => {
      const currentItems = itemsRef.current
      const item = currentItems[index]
      if (!item) return

      const updatedItems = [...currentItems]
      updatedItems[index] = updateInventoryItemField(item, field, value)
      onItemsChange(updatedItems)
    },
    [onItemsChange]
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
  const shouldVirtualize = React.useMemo(() => items.length > 100, [items.length])

  // Get table width for virtual rows (used by VirtualizedTableBody via setTableWidth)
  const [_tableWidth, setTableWidth] = React.useState<number | undefined>(undefined)

  const statusFilters: { value: TableFilter; label: string }[] = [
    { value: "unreviewed", label: "Unreviewed" },
    { value: "in_progress", label: "In Progress" },
    { value: "reviewed", label: "Reviewed" },
    { value: "flagged", label: "Flagged" },
    { value: "finalized", label: "Finalized" },
    { value: "all", label: "All" },
  ]

  return (
    <div
      className={cn(
        "relative rounded border border-border bg-card overflow-hidden flex flex-col h-full",
        shouldVirtualize ? "" : "min-h-[400px]"
      )}
      role="region"
      aria-label="Inventory table"
      aria-rowcount={items.length}
      aria-colcount={visibleColumns.length + 1}
    >
      {/* ELITE UX: Quick filter buttons */}
      {onStatusFilterChange && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground">Filter:</span>
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onStatusFilterChange(filter.value)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-colors",
                statusFilter === filter.value
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-background hover:bg-muted text-muted-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
          {totalFiles !== undefined && (
            <span className="ml-auto text-xs text-muted-foreground">
              {items.length} of {totalFiles} files
            </span>
          )}
        </div>
      )}
      <div
        ref={parentRef}
        className={cn(
          "relative",
          shouldVirtualize ? "flex-1 min-h-0 overflow-auto" : "overflow-auto"
        )}
        style={{
          height: shouldVirtualize ? "100%" : "auto",
          maxHeight: shouldVirtualize ? "100%" : "none",
        }}
      >
        <table
          ref={tableRef}
          className="caption-bottom text-sm table-fixed border-collapse w-full"
          style={{
            display: "table",
            minWidth: `${40 + Array.from<number>(columnWidths.values()).reduce((sum: number, w: number) => sum + w, 0)}px`,
          }}
          role="grid"
          aria-label="Document inventory items"
        >
          <colgroup>
            <col style={{ width: "40px" }} />
            {visibleColumns.map((column) => {
              // ELITE: Use pre-computed widths instead of recalculating
              const width = columnWidths.get(column.id) || 120
              return <col key={column.id} style={{ width: `${width}px` }} />
            })}
          </colgroup>
          <TableHeader
            className="sticky top-0 z-30 border-b border-border"
            role="rowgroup"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              display: "table-header-group",
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
              {visibleColumns.map((column) => (
                <TableHead key={column.id} role="columnheader" scope="col" className="bg-muted/95">
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody
            role="rowgroup"
            style={
              shouldVirtualize
                ? {
                    position: "relative",
                    display: "table-row-group",
                  }
                : undefined
            }
          >
            {items.length === 0 ? (
              <TableRow role="row">
                <TableCell colSpan={visibleColumns.length + 1} className="p-0" role="gridcell">
                  <div className="min-h-[300px] flex items-center justify-center">
                    <EmptyState
                      icon={FolderOpen}
                      title="No files found"
                      description="Select a folder to scan and generate your inventory."
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : shouldVirtualize ? (
              // Virtualized rendering for large datasets - use isolated component
              <VirtualizedTableBody
                items={items}
                selectedRows={selectedRows}
                handleToggleRow={handleToggleRow}
                handleUpdate={handleUpdate}
                onFileOpen={onFileOpen}
                changedFiles={changedFiles}
                parentRef={parentRef}
                tableRef={tableRef}
                setTableWidth={setTableWidth}
                columns={visibleColumns}
                getColumnWidth={getColumnWidth}
              />
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
                  onFileOpen={onFileOpen}
                  columns={visibleColumns}
                  getColumnWidth={getColumnWidth}
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
