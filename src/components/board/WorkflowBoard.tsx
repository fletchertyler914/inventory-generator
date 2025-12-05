import { useMemo, useCallback, useState, useEffect, useRef } from "react"
import { ScrollArea } from "../ui/scroll-area"
import { Badge } from "../ui/badge"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { FileText, Search, X } from "lucide-react"
import { WorkflowCard } from "./WorkflowCard"
import { cn } from "@/lib/utils"
import { updateInventoryItemField, type InventoryItem, type FileStatus } from "@/types/inventory"
import { fileService } from "@/services/fileService"
import { useFileNoteCounts } from "@/hooks/useFileNoteCounts"
import { useFileDuplicateCounts } from "@/hooks/useFileDuplicateCounts"
import { useWorkflowSelection } from "@/hooks/useWorkflowSelection"
import { useSwimlaneFilter } from "@/hooks/useSwimlaneFilter"
import { getDuplicateGroupVisualEncoding, clearEncodingCache } from "@/lib/duplicate-color-palette"
import { useTheme } from "@/hooks/useTheme"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type TableFilter = "unreviewed" | "in_progress" | "reviewed" | "flagged" | "finalized" | "all"

interface WorkflowBoardProps {
  items: InventoryItem[]
  onItemsChange: (items: InventoryItem[]) => void
  onSelectionChange?: ((selectedIndices: number[]) => void) | undefined
  selectedIndices?: number[] | undefined
  onFileOpen?: ((filePath: string) => void) | undefined
  onFileRemove?: ((file: InventoryItem) => void) | undefined
  statusFilter?: TableFilter
  onStatusFilterChange?: (filter: TableFilter) => void
  totalFiles?: number
  caseId?: string
}

const workflowStates: { value: FileStatus; label: string; color: string }[] = [
  {
    value: "unreviewed",
    label: "Unreviewed",
    color: "text-muted-foreground",
  },
  {
    value: "in_progress",
    label: "In Progress",
    color: "text-blue-400",
  },
  {
    value: "reviewed",
    label: "Reviewed",
    color: "text-green-400",
  },
  {
    value: "flagged",
    label: "Flagged",
    color: "text-yellow-400",
  },
  {
    value: "finalized",
    label: "Finalized",
    color: "text-green-500",
  },
]

// Sortable WorkflowCard wrapper component
function SortableWorkflowCard({
  item,
  index,
  isSelected,
  onSelect,
  onFileOpen,
  fileChanged,
  isDragging,
  caseId,
  noteCount,
  duplicateCount,
  duplicateGroupId,
  duplicateShape,
}: {
  item: InventoryItem
  index: number
  isSelected: boolean
  onSelect: (event: React.MouseEvent) => void
  onFileOpen?: (filePath: string) => void
  fileChanged: boolean
  isDragging: boolean
  caseId?: string
  noteCount?: number
  duplicateCount?: number
  duplicateGroupId?: string
  duplicateShape?: 'dot' | 'square' | 'diamond'
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `file-${item.absolute_path}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <WorkflowCard
        item={item}
        isSelected={isSelected}
        onSelect={onSelect}
        onFileOpen={onFileOpen}
        fileChanged={fileChanged}
        isDragging={isDragging || isSortableDragging}
        caseId={caseId}
        noteCount={noteCount}
        duplicateCount={duplicateCount}
        duplicateGroupId={duplicateGroupId}
        duplicateShape={duplicateShape}
        dragListeners={listeners}
        dragAttributes={attributes}
      />
    </div>
  )
}

// Droppable column component
function DroppableColumn({
  status,
  label,
  color,
  count,
  children,
  isOver,
  itemIds,
  filterQuery,
  filterVisible,
  onFilterToggle,
  onFilterChange,
  onFilterClear,
}: {
  status: FileStatus
  label: string
  color: string
  count: number
  children: React.ReactNode
  isOver: boolean
  itemIds: string[]
  filterQuery: string
  filterVisible: boolean
  onFilterToggle: () => void
  onFilterChange: (query: string) => void
  onFilterClear: () => void
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `column-${status}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-h-[240px] min-w-[340px] w-[340px] rounded-lg border transition-all duration-200 bg-card shadow-sm flex-shrink-0",
        "border-border/40 dark:border-border/50",
        isOver || isDroppableOver
          ? "border-primary border-2 dark:border-primary bg-primary/5 shadow-lg scale-[1.01]"
          : "hover:border-border/60 dark:hover:border-border/70"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "px-3 py-2.5 border-b flex items-center justify-between flex-shrink-0 rounded-t-lg transition-colors",
          isOver || isDroppableOver 
            ? "border-primary dark:border-primary bg-primary/10" 
            : "border-border/40 dark:border-border/50 bg-card"
        )}
      >
        <h3 className={cn("text-sm font-semibold truncate", color)}>{label}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* ELITE: Search icon button - right justified */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0 hover:bg-muted"
            onClick={onFilterToggle}
            title="Filter files"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 font-medium flex-shrink-0",
              count === 0 && "opacity-50"
            )}
          >
            {count}
          </Badge>
        </div>
      </div>

      {/* ELITE: Filter input row - appears between header and card list */}
      {filterVisible && (
        <div className="px-3 py-2 border-b border-border/40 dark:border-border/50 bg-muted/20 flex-shrink-0 transition-all duration-200">
          <div className="relative flex items-center gap-2">
            <Input
              type="text"
              placeholder="Filter files..."
              value={filterQuery}
              onChange={(e) => onFilterChange(e.target.value)}
              className="h-8 text-sm pr-8"
              autoFocus
            />
            {filterQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 h-6 w-6 p-0 hover:bg-muted"
                onClick={onFilterClear}
                title="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Column Content - fits content with scrolling when needed */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  )
}

// Platform detection for modifier key display
const isMacOS = (): boolean => {
  if (typeof navigator === "undefined") return false
  const nav = navigator as Navigator & { userAgentData?: { platform: string } }
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "macos"
  }
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("mac os x") || userAgent.includes("macintosh")) {
    return true
  }
  const platform = navigator.platform?.toUpperCase() || ""
  return platform.indexOf("MAC") >= 0
}

export function WorkflowBoard({
  items,
  onItemsChange,
  onSelectionChange,
  selectedIndices,
  onFileOpen,
  onFileRemove,
  statusFilter: _statusFilter = "all",
  onStatusFilterChange: _onStatusFilterChange,
  totalFiles: _totalFiles,
  caseId,
}: WorkflowBoardProps) {
  // Track which files have changed
  const [changedFiles, setChangedFiles] = useState<Set<string>>(new Set())
  // Track active drag
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  // Track selected items being dragged (for multi-drag)
  const [draggingSelectedItems, setDraggingSelectedItems] = useState<InventoryItem[]>([])
  // Track if mouse moved during mousedown (to distinguish clicks from drags)
  const mouseMovedRef = useRef(false)
  const mouseDownTimeRef = useRef<number | null>(null)

  // Use optimized selection hook
  const { isSelected, handleSelect, selectedCount } = useWorkflowSelection({
    selectedIndices,
    onSelectionChange,
    totalItems: items.length,
  })

  // Memoize platform detection for modifier key hint
  const modifierKey = useMemo(() => (isMacOS() ? "⌘" : "⌃"), [])

  // Fetch note counts for all files in the case
  const { noteCounts } = useFileNoteCounts(caseId)
  // Fetch duplicate counts and group IDs for all files in the case
  const { duplicateCounts, duplicateGroupIds } = useFileDuplicateCounts(caseId ?? undefined)

  // ELITE: Swimlane filter hook - independent filtering per swimlane
  const {
    filterQueries,
    filterVisible,
    filteredItems: filteredItemsByStatusMap,
    setFilterQuery,
    toggleFilter,
    clearFilter,
  } = useSwimlaneFilter({ items })

  // Memoize note count lookups for each item
  const itemNoteCounts = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((item) => {
      if (item.id) {
        const count = noteCounts.get(item.id)
        if (count !== undefined && count > 0) {
          counts.set(item.absolute_path, count)
        }
      }
    })
    return counts
  }, [items, noteCounts])

  // Memoize duplicate count lookups for each item
  const itemDuplicateCounts = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((item) => {
      if (item.id) {
        const count = duplicateCounts.get(item.id)
        if (count !== undefined && count > 0) {
          counts.set(item.absolute_path, count)
        }
      }
    })
    return counts
  }, [items, duplicateCounts])

  // ELITE: Collect visible duplicate groupIds and compute visual encodings
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  // Collect all visible duplicate groupIds
  const visibleGroupIds = useMemo(() => {
    const groupIdSet = new Set<string>()
    items.forEach((item) => {
      if (item.id) {
        const groupId = duplicateGroupIds.get(item.id)
        if (groupId) {
          groupIdSet.add(groupId)
        }
      }
    })
    return Array.from(groupIdSet)
  }, [items, duplicateGroupIds])

  // Compute visual encodings for all visible groups (memoized, batch processed)
  const groupShapes = useMemo(() => {
    const shapes = new Map<string, 'dot' | 'square' | 'diamond'>()
    
    // Clear cache when visible groups change significantly
    if (visibleGroupIds.length > 0) {
      // Compute encodings for all visible groups
      visibleGroupIds.forEach((groupId) => {
        const encoding = getDuplicateGroupVisualEncoding(groupId, visibleGroupIds, isDark)
        shapes.set(groupId, encoding.shape)
      })
    }
    
    return shapes
  }, [visibleGroupIds, isDark])

  // Clear encoding cache when caseId changes
  useEffect(() => {
    clearEncodingCache()
  }, [caseId])

  // Check file changes for visible items (debounced)
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

  // Group items by status (for drag operations)
  const itemsByStatus = useMemo(() => {
    const grouped: Record<FileStatus | "unreviewed", InventoryItem[]> = {
      unreviewed: [],
      in_progress: [],
      reviewed: [],
      flagged: [],
      finalized: [],
    }

    items.forEach((item) => {
      const status = item.status || "unreviewed"
      if (status in grouped) {
        grouped[status as FileStatus].push(item)
      } else {
        grouped.unreviewed.push(item)
      }
    })

    return grouped
  }, [items])

  // ELITE: Use filtered items from hook for display (memoized per swimlane)
  const filteredItemsByStatus = useMemo(() => {
    const grouped: Record<FileStatus | "unreviewed", InventoryItem[]> = {
      unreviewed: [],
      in_progress: [],
      reviewed: [],
      flagged: [],
      finalized: [],
    }

    // Get filtered items from hook for each status
    const statuses: FileStatus[] = [
      'unreviewed',
      'in_progress',
      'reviewed',
      'flagged',
      'finalized',
    ]

    for (const status of statuses) {
      const filtered = filteredItemsByStatusMap.get(status) || []
      grouped[status] = filtered
    }

    return grouped
  }, [filteredItemsByStatusMap])

  const handleStatusChange = useCallback(
    async (itemPaths: string | string[], newStatus: FileStatus) => {
      const paths = Array.isArray(itemPaths) ? itemPaths : [itemPaths]
      const itemsToUpdate = paths
        .map((path) => {
          const item = items.find((i) => i.absolute_path === path)
          if (!item) return null
          const currentStatus = item.status || "unreviewed"
          if (currentStatus === newStatus) return null
          return { item, index: items.findIndex((i) => i.absolute_path === path) }
        })
        .filter((entry): entry is { item: InventoryItem; index: number } => entry !== null)

      if (itemsToUpdate.length === 0) return

      // Update local state immediately for responsive UI
      const updatedItems = [...items]
      itemsToUpdate.forEach(({ item, index }) => {
        updatedItems[index] = updateInventoryItemField(item, "status", newStatus)
      })
      onItemsChange(updatedItems)

      // Persist to database (batch updates in parallel)
      const updatePromises = itemsToUpdate
        .filter(({ item }) => item.id)
        .map(({ item }) =>
          fileService
            .updateFileStatus(item.id!, newStatus)
            .then(() => {
              console.log("[WorkflowBoard] Successfully updated file status in database:", item.id)
            })
            .catch((error) => {
              console.error(
                "[WorkflowBoard] Failed to update file status in database:",
                error,
                item.id
              )
              // Revert this item on error
              const revertedItems = [...updatedItems]
              const revertIndex = revertedItems.findIndex(
                (i) => i.absolute_path === item.absolute_path
              )
              if (revertIndex !== -1) {
                revertedItems[revertIndex] = item
                onItemsChange(revertedItems)
              }
            })
        )

      await Promise.all(updatePromises)
    },
    [items, onItemsChange]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = event.active.id as string
      setActiveId(activeId)

      // Check if multiple items are selected
      if (selectedIndices && selectedIndices.length > 1) {
        // Extract the dragged item path
        if (activeId.startsWith("file-")) {
          const draggedPath = activeId.replace("file-", "")
          const draggedItem = items.find((i) => i.absolute_path === draggedPath)

          // If the dragged item is in the selection, drag all selected items
          if (draggedItem) {
            const draggedIndex = items.findIndex((i) => i.absolute_path === draggedPath)
            if (selectedIndices.includes(draggedIndex)) {
              const selectedItems = selectedIndices
                .map((idx) => items[idx])
                .filter((item): item is InventoryItem => item !== undefined)
              setDraggingSelectedItems(selectedItems)
              return
            }
          }
        }
      }

      // Single item drag
      setDraggingSelectedItems([])
    },
    [selectedIndices, items]
  )

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    setOverId(over ? (over.id as string) : null)
  }, [])

  const handleSortOrderChange = useCallback(
    async (activePath: string, overPath: string, status: FileStatus) => {
      const statusItems = itemsByStatus[status] || []
      const activeIndex = statusItems.findIndex((i) => i.absolute_path === activePath)
      const overIndex = statusItems.findIndex((i) => i.absolute_path === overPath)
      
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return

      // Reorder items in the status column
      const reorderedStatusItems = [...statusItems]
      const [movedItem] = reorderedStatusItems.splice(activeIndex, 1)
      reorderedStatusItems.splice(overIndex, 0, movedItem)

      // Create a map of all items by absolute_path for quick lookup
      const itemsMap = new Map(items.map((item) => [item.absolute_path, item]))
      
      // Update items in the map with reordered status items
      reorderedStatusItems.forEach((item) => {
        itemsMap.set(item.absolute_path, item)
      })

      // Reconstruct items array maintaining the original order but with updated status items
      // Group items by status to maintain status-based grouping
      const itemsByStatusMap = new Map<FileStatus, InventoryItem[]>()
      items.forEach((item) => {
        const itemStatus = (item.status || "unreviewed") as FileStatus
        if (!itemsByStatusMap.has(itemStatus)) {
          itemsByStatusMap.set(itemStatus, [])
        }
        // Use reordered items for the target status, original order for others
        if (itemStatus === status) {
          const reorderedItem = reorderedStatusItems.find(
            (i) => i.absolute_path === item.absolute_path
          )
          if (reorderedItem) {
            itemsByStatusMap.get(itemStatus)!.push(reorderedItem)
          }
        } else {
          itemsByStatusMap.get(itemStatus)!.push(item)
        }
      })

      // Reconstruct items array maintaining status order and new sort order within each status
      const newItems: InventoryItem[] = []
      workflowStates.forEach((state) => {
        const statusItems = itemsByStatusMap.get(state.value) || []
        newItems.push(...statusItems)
      })

      onItemsChange(newItems)

      // TODO: Persist sort order to database when backend support is added
      // For now, sort order is maintained in memory
      console.log(
        "[WorkflowBoard] Sort order changed for:",
        activePath,
        "to position of:",
        overPath
      )
    },
    [items, itemsByStatus, onItemsChange]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      const activeId = active.id as string
      const overId = over?.id as string

      setActiveId(null)
      setOverId(null)

      if (!over) {
        setDraggingSelectedItems([])
        return
      }

      // Check if dragging within the same column (reordering)
      if (overId.startsWith("file-")) {
        const activePath = activeId.replace("file-", "")
        const overPath = overId.replace("file-", "")
        
        const activeItem = items.find((i) => i.absolute_path === activePath)
        const overItem = items.find((i) => i.absolute_path === overPath)
        
        if (activeItem && overItem) {
          const activeStatus = activeItem.status || "unreviewed"
          const overStatus = overItem.status || "unreviewed"
          
          // Same status = reordering within column
          if (activeStatus === overStatus) {
            handleSortOrderChange(activePath, overPath, activeStatus)
            setDraggingSelectedItems([])
            return
          }
        }
      }

      // Extract status from over ID (format: "column-{status}")
      if (!overId.startsWith("column-")) {
        setDraggingSelectedItems([])
        return
      }

      const newStatus = overId.replace("column-", "") as FileStatus

      // Validate status
      if (!workflowStates.some((state) => state.value === newStatus)) {
        setDraggingSelectedItems([])
        return
      }

      // Handle multi-drag: update all selected items
      if (draggingSelectedItems.length > 0) {
        const itemPaths = draggingSelectedItems.map((item) => item.absolute_path)
        handleStatusChange(itemPaths, newStatus)
        setDraggingSelectedItems([])
        return
      }

      // Single item drag between columns
      if (!activeId.startsWith("file-")) {
        setDraggingSelectedItems([])
        return
      }

      const itemPath = activeId.replace("file-", "")
      handleStatusChange(itemPath, newStatus)
      setDraggingSelectedItems([])
    },
    [handleStatusChange, handleSortOrderChange, draggingSelectedItems, items, itemsByStatus]
  )


  const activeItem = activeId
    ? items.find((item) => `file-${item.absolute_path}` === activeId)
    : null

  // Determine if we're dragging multiple items
  const isMultiDrag = draggingSelectedItems.length > 1

  // Configure sensors with activation constraints to prevent accidental drags on clicks
  // Require 10px of movement before drag starts - this allows clicks to work normally
  // This ensures selection clicks (with modifier keys) don't trigger drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Require 10px of movement before drag starts
      },
    })
  )

  // Ref for board container to detect clicks outside
  const boardRef = useRef<HTMLDivElement>(null)

  // Handle clicks outside cards to deselect all
  useEffect(() => {
    const handleMouseDown = () => {
      // Reset mouse moved flag on mousedown
      mouseMovedRef.current = false
      mouseDownTimeRef.current = Date.now()
    }

    const handleMouseMove = () => {
      // Only track movement if we're in a mousedown cycle
      if (mouseDownTimeRef.current !== null) {
        mouseMovedRef.current = true
      }
    }

    const handleMouseUp = () => {
      // Clear mousedown time after a short delay to allow click event to check
      setTimeout(() => {
        mouseDownTimeRef.current = null
      }, 100)
    }

    const handleClickOutside = (event: MouseEvent) => {
      // Don't clear selection if a drag is in progress
      if (activeId !== null) {
        mouseMovedRef.current = false
        return
      }

      // Don't clear if mouse moved significantly (indicating drag attempt)
      // The drag system uses 10px activation, so any movement suggests drag intent
      if (mouseMovedRef.current) {
        mouseMovedRef.current = false
        return
      }

      // Don't clear selection if clicking on interactive elements
      const target = event.target as HTMLElement
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("[role='button']") ||
        target.closest("[role='dialog']") ||
        target.closest("[data-radix-portal]")
      ) {
        return
      }

      // Check if click is on a card (cards have the data attribute)
      const isCardClick = target.closest('[data-workflow-card]') !== null

      // If clicking outside the board container or on empty space within the board (not on a card)
      if (boardRef.current) {
        const isInsideBoard = boardRef.current.contains(target)
        // Clear selection when clicking outside the board or on empty space within the board (not on a card)
        if ((!isInsideBoard || (isInsideBoard && !isCardClick)) && selectedCount > 0 && onSelectionChange) {
          onSelectionChange([])
        }
      }
    }

    // Only attach listeners if there are selected items
    if (selectedCount > 0) {
      // Track mousedown, mousemove, and mouseup to detect drags
      document.addEventListener("mousedown", handleMouseDown)
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      // Use 'click' instead of 'mousedown' to avoid interfering with drag operations
      // 'click' fires after mouseup, so we can check if mouse moved
      document.addEventListener("click", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleMouseDown)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("click", handleClickOutside)
      }
    }
  }, [selectedCount, onSelectionChange, activeId])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div ref={boardRef} className="h-full flex flex-col overflow-hidden">
        {/* Modifier Key Hint - Clean and intuitive */}
        <div className="px-4 pt-2 pb-1 flex-shrink-0 border-b border-border/20">
          <p className="text-xs text-muted-foreground/60">
            {selectedCount > 0 ? (
              <>
                <span className="font-medium text-muted-foreground">{selectedCount} selected</span>
                {" • "}
              </>
            ) : null}
            {modifierKey}+Click to multiselect, Shift+Click for range
          </p>
        </div>
        {/* Board Columns - Swimlanes replace filters */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
          <div className="flex items-start gap-3 p-4 pb-6 h-full">
            {workflowStates.map((state) => {
              const stateItems = filteredItemsByStatus[state.value] || []
              const count = stateItems.length
              const isOver = overId === `column-${state.value}`
              const filterQuery = filterQueries.get(state.value) || ''
              const filterVisibleForStatus = filterVisible.get(state.value) || false

              return (
                <DroppableColumn
                  key={state.value}
                  status={state.value}
                  label={state.label}
                  color={state.color}
                  count={count}
                  isOver={isOver}
                  itemIds={stateItems.map((item) => `file-${item.absolute_path}`)}
                  filterQuery={filterQuery}
                  filterVisible={filterVisibleForStatus}
                  onFilterToggle={() => toggleFilter(state.value)}
                  onFilterChange={(query) => setFilterQuery(state.value, query)}
                  onFilterClear={() => clearFilter(state.value)}
                >
                  {stateItems.length === 0 ? (
                    <div
                      className={cn(
                        "py-12 text-center rounded-md border-2 border-dashed transition-all duration-200 mx-2",
                        isOver
                          ? "border-primary dark:border-primary bg-primary/10 scale-[1.02]"
                          : "border-border/40 dark:border-border/50 bg-muted/20"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground/60 font-medium">
                          {isOver ? "Drop here" : "No files"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    stateItems.map((item, idx) => {
                      const itemIndex = items.findIndex(
                        (i) => i.absolute_path === item.absolute_path
                      )
                      return (
                        <SortableWorkflowCard
                          key={item.absolute_path || idx}
                          item={item}
                          index={idx}
                          isSelected={isSelected(itemIndex)}
                          onSelect={(e) => handleSelect(itemIndex, e)}
                          {...(onFileOpen && { onFileOpen })}
                          fileChanged={changedFiles.has(item.id || item.absolute_path)}
                          isDragging={activeId === `file-${item.absolute_path}`}
                          caseId={caseId}
                          noteCount={itemNoteCounts.get(item.absolute_path)}
                          duplicateCount={itemDuplicateCounts.get(item.absolute_path) ?? undefined}
                          duplicateGroupId={duplicateGroupIds.get(item.id)}
                          duplicateShape={item.id ? groupShapes.get(duplicateGroupIds.get(item.id) || '') : undefined}
                        />
                      )
                    })
                  )}
                </DroppableColumn>
              )
            })}
          </div>
        </div>
      </div>

      {/* Drag Overlay - shows the card(s) being dragged */}
      <DragOverlay>
        {isMultiDrag ? (
          <div className="relative" style={{ minWidth: "340px", minHeight: "120px" }}>
            {/* Stack of multiple card previews with offset/rotation for visual depth */}
            {draggingSelectedItems.slice(0, 3).map((item, idx) => (
              <div
                key={item.absolute_path}
                className="absolute"
                style={{
                  transform: `translate(${idx * 8}px, ${idx * 8}px) rotate(${idx * 2}deg)`,
                  zIndex: draggingSelectedItems.length - idx,
                }}
              >
                <div className="opacity-90">
                  <WorkflowCard
                    item={item}
                    isDragging={true}
                    caseId={caseId}
                    noteCount={itemNoteCounts.get(item.absolute_path)}
                    duplicateCount={itemDuplicateCounts.get(item.absolute_path) ?? undefined}
                    duplicateGroupId={duplicateGroupIds.get(item.id)}
                    duplicateShape={item.id ? groupShapes.get(duplicateGroupIds.get(item.id) || '') : undefined}
                  />
                </div>
              </div>
            ))}
            {/* Show count badge if more than 3 items */}
            {draggingSelectedItems.length > 3 && (
              <div
                className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-md shadow-lg z-50"
                style={{
                  transform: `translate(${3 * 8}px, ${3 * 8}px)`,
                }}
              >
                +{draggingSelectedItems.length - 3}
              </div>
            )}
          </div>
        ) : activeItem ? (
          <div className="opacity-90 rotate-2">
            <WorkflowCard
              item={activeItem}
              isDragging={true}
              caseId={caseId}
              noteCount={itemNoteCounts.get(activeItem.absolute_path)}
              duplicateCount={itemDuplicateCounts.get(activeItem.absolute_path) ?? undefined}
              duplicateGroupId={duplicateGroupIds.get(activeItem.id)}
              duplicateShape={activeItem.id ? groupShapes.get(duplicateGroupIds.get(activeItem.id) || '') : undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
