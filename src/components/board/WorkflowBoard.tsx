import { useMemo, useCallback, useState, useEffect } from "react"
import { ScrollArea } from "../ui/scroll-area"
import { Badge } from "../ui/badge"
import { FileText } from "lucide-react"
import { WorkflowCard } from "./WorkflowCard"
import { cn } from "@/lib/utils"
import { updateInventoryItemField, type InventoryItem, type FileStatus } from "@/types/inventory"
import { fileService } from "@/services/fileService"
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

// Droppable column component
function DroppableColumn({
  status,
  label,
  color,
  count,
  children,
  isOver,
}: {
  status: FileStatus
  label: string
  color: string
  count: number
  children: React.ReactNode
  isOver: boolean
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: `column-${status}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-h-[240px] max-h-full min-w-[280px] w-[280px] rounded-lg border transition-all duration-200 bg-card shadow-sm flex-shrink-0",
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

      {/* Column Content - fits content with scrolling when needed */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full max-h-full">
          <div className="p-2 space-y-2">{children}</div>
        </ScrollArea>
      </div>
    </div>
  )
}

export function WorkflowBoard({
  items,
  onItemsChange,
  onSelectionChange: _onSelectionChange,
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

  // Group items by status
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

  // Always show all columns - swimlanes are the primary interface
  const filteredItemsByStatus = itemsByStatus

  const handleStatusChange = useCallback(
    async (itemPath: string, newStatus: FileStatus) => {
      const item = items.find((i) => i.absolute_path === itemPath)
      if (!item) {
        console.warn("[WorkflowBoard] Item not found for path:", itemPath)
        return
      }

      const index = items.findIndex((i) => i.absolute_path === itemPath)
      if (index === -1) {
        console.warn("[WorkflowBoard] Item index not found for path:", itemPath)
        return
      }

      // Check if status is actually changing
      const currentStatus = item.status || "unreviewed"
      if (currentStatus === newStatus) {
        return
      }

      // Update local state immediately for responsive UI
      const updatedItems = [...items]
      updatedItems[index] = updateInventoryItemField(item, "status", newStatus)
      onItemsChange(updatedItems)

      // Persist to database
      if (item.id) {
        fileService
          .updateFileStatus(item.id, newStatus)
          .then(() => {
            console.log("[WorkflowBoard] Successfully updated file status in database")
          })
          .catch((error) => {
            console.error("[WorkflowBoard] Failed to update file status in database:", error)
            // Revert local state on error
            const revertedItems = [...items]
            revertedItems[index] = item
            onItemsChange(revertedItems)
          })
      } else {
        console.warn("[WorkflowBoard] Item has no ID, cannot persist to database", item)
      }
    },
    [items, onItemsChange]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    setOverId(over ? (over.id as string) : null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)
      setOverId(null)

      if (!over) {
        return
      }

      const activeId = active.id as string
      const overId = over.id as string

      // Extract file path from active ID (format: "file-{path}")
      if (!activeId.startsWith("file-")) {
        return
      }

      const itemPath = activeId.replace("file-", "")

      // Extract status from over ID (format: "column-{status}")
      if (!overId.startsWith("column-")) {
        return
      }

      const newStatus = overId.replace("column-", "") as FileStatus

      // Validate status
      if (!workflowStates.some((state) => state.value === newStatus)) {
        return
      }

      handleStatusChange(itemPath, newStatus)
    },
    [handleStatusChange]
  )

  const getStatusCount = (status: FileStatus) => {
    return itemsByStatus[status].length
  }

  const activeItem = activeId
    ? items.find((item) => `file-${item.absolute_path}` === activeId)
    : null

  // Configure sensors with activation constraints to prevent accidental drags on clicks
  // Require 10px of movement before drag starts - this allows clicks to work normally
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Require 10px of movement before drag starts
      },
    })
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* Board Columns - Swimlanes replace filters */}
        <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
          <div className="flex items-start gap-3 p-4 pb-6">
            {workflowStates.map((state) => {
              const stateItems = filteredItemsByStatus[state.value] || []
              const count = getStatusCount(state.value)
              const isOver = overId === `column-${state.value}`

              return (
                <DroppableColumn
                  key={state.value}
                  status={state.value}
                  label={state.label}
                  color={state.color}
                  count={count}
                  isOver={isOver}
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
                    stateItems.map((item, idx) => (
                      <WorkflowCard
                        key={item.absolute_path || idx}
                        item={item}
                        isSelected={
                          selectedIndices?.includes(
                            items.findIndex((i) => i.absolute_path === item.absolute_path)
                          ) ?? false
                        }
                        {...(onFileOpen && { onFileOpen })}
                        fileChanged={changedFiles.has(item.id || item.absolute_path)}
                        isDragging={activeId === `file-${item.absolute_path}`}
                        caseId={caseId}
                      />
                    ))
                  )}
                </DroppableColumn>
              )
            })}
          </div>
        </div>
      </div>

      {/* Drag Overlay - shows the card being dragged */}
      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 rotate-2">
            <WorkflowCard item={activeItem} isDragging={true} caseId={caseId} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
