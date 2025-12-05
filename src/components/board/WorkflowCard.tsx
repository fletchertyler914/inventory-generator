import { memo } from "react"
import { Folder, StickyNote } from "lucide-react"
import { Badge } from "../ui/badge"
import { cn } from "@/lib/utils"
import { getFileIcon } from "@/lib/file-icon-utils"
import type { InventoryItem } from "@/types/inventory"
import { useDraggable } from "@dnd-kit/core"
import { getKeyMappingFields, formatMappingValue } from "@/lib/inventory-utils"
import { DuplicateBadge } from "../duplicates/DuplicateBadge"

interface WorkflowCardProps {
  item: InventoryItem
  isSelected?: boolean
  onSelect?: (event: React.MouseEvent) => void
  onFileOpen?: (filePath: string) => void
  fileChanged?: boolean
  isDragging?: boolean
  caseId?: string
  noteCount?: number
  duplicateCount?: number
  duplicateGroupId?: string
  dragListeners?: any
  dragAttributes?: any
}

export const WorkflowCard = memo(function WorkflowCard({
  item,
  isSelected = false,
  onSelect,
  onFileOpen,
  fileChanged = false,
  isDragging = false,
  caseId,
  noteCount,
  duplicateCount,
  duplicateGroupId,
  dragListeners: externalListeners,
  dragAttributes: externalAttributes,
}: WorkflowCardProps) {
  // Get key mapping fields to display (top 2 priority fields)
  const keyFields = getKeyMappingFields(item, caseId, 2)
  
  // Use external drag listeners/attributes if provided (from sortable), otherwise use draggable
  const {
    attributes: draggableAttributes,
    listeners: draggableListeners,
    setNodeRef: setDraggableRef,
    transform: draggableTransform,
    isDragging: isDndDragging,
  } = useDraggable({
    id: `file-${item.absolute_path}`,
    data: {
      type: "file",
      item,
    },
    disabled: !!externalListeners, // Disable draggable if using sortable
  })

  // Use external listeners/attributes if provided, otherwise use draggable
  const listeners = externalListeners || draggableListeners
  const attributes = externalAttributes || draggableAttributes
  const setNodeRef = externalListeners ? undefined : setDraggableRef
  const transform = externalListeners ? undefined : draggableTransform

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const handleClick = (e: React.MouseEvent) => {
    // Don't open file if we just finished dragging or are currently dragging
    if (isDndDragging) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // Check for modifier keys (Cmd/Ctrl or Shift) for selection
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
    const modifierKey = isMac ? e.metaKey : e.ctrlKey
    const shiftKey = e.shiftKey

    // If modifier keys are pressed, handle selection instead of opening file
    if ((modifierKey || shiftKey) && onSelect) {
      e.preventDefault()
      e.stopPropagation()
      onSelect(e)
      return
    }

    // Normal click: open file (only if no modifier keys)
    if (!modifierKey && !shiftKey && onFileOpen && item.absolute_path) {
      onFileOpen(item.absolute_path)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative rounded-lg border bg-card p-2.5 shadow-sm transition-all duration-200",
        "border-border/40 dark:border-border/50",
        "hover:shadow-md hover:border-primary/60 dark:hover:border-primary/50 cursor-grab active:cursor-grabbing",
        isSelected && "ring-2 ring-primary ring-offset-1 border-primary dark:border-primary",
        (isDragging || isDndDragging) && "opacity-50 scale-95",
        "flex flex-col gap-2 select-none overflow-hidden w-full max-w-full"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick(e as any)
        }
      }}
    >
      {/* File Icon and Type Badge */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="text-muted-foreground flex-shrink-0">
            {getFileIcon(item.file_type)}
          </div>
          <h4 className="text-xs font-medium text-foreground truncate leading-tight" title={item.file_name}>
            {item.file_name}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {duplicateCount !== undefined && duplicateCount > 0 && (
            <DuplicateBadge 
              groupId={duplicateGroupId} 
              count={duplicateCount} 
              className="h-1.5 w-1.5" 
            />
          )}
          <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 h-4 pointer-events-none">
            {item.file_type.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Folder Path */}
      {item.folder_name && item.folder_name !== '-' && (
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Folder className="h-3 w-3 flex-shrink-0" />
            <span className="truncate" title={item.folder_path}>
              {item.folder_name}
            </span>
          </div>
          {/* Note indicator - inline with folder path */}
          {noteCount !== undefined && noteCount > 0 && (
            <StickyNote className="h-3 w-3 text-muted-foreground opacity-30 flex-shrink-0" />
          )}
        </div>
      )}

      {/* Key Mapping Fields */}
      {keyFields.length > 0 && (
        <div className="space-y-1.5">
          {keyFields.map((field, idx) => (
            <div key={field.columnId} className={cn(
              "flex items-center text-[10px] text-muted-foreground min-w-0",
              idx === keyFields.length - 1 ? "justify-between gap-2" : "gap-1.5"
            )}>
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="font-medium truncate">{field.label}:</span>
                <span className="truncate text-foreground">{formatMappingValue(field.value)}</span>
              </div>
              {/* Note indicator - inline with last key field */}
              {idx === keyFields.length - 1 && noteCount !== undefined && noteCount > 0 && (
                <StickyNote className="h-3 w-3 text-muted-foreground opacity-30 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-[9px] px-1.5 py-0 h-4 pointer-events-none"
              >
                {tag}
              </Badge>
            ))}
            {item.tags.length > 2 && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 pointer-events-none">
                +{item.tags.length - 2}
              </Badge>
            )}
          </div>
          {/* Note indicator - inline with tags */}
          {noteCount !== undefined && noteCount > 0 && (
            <StickyNote className="h-3 w-3 text-muted-foreground opacity-30 flex-shrink-0" />
          )}
        </div>
      )}

      {/* File Changed Indicator */}
      {fileChanged && (
        <div className="absolute top-1.5 right-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shadow-sm" title="File has been modified" />
        </div>
      )}
    </div>
  )
})
