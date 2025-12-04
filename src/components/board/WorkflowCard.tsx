import { memo } from "react"
import { FileText, Image, File, Folder } from "lucide-react"
import { Badge } from "../ui/badge"
import { cn } from "@/lib/utils"
import type { InventoryItem } from "@/types/inventory"
import { useDraggable } from "@dnd-kit/core"
import { getKeyMappingFields, formatMappingValue } from "@/lib/inventory-utils"

interface WorkflowCardProps {
  item: InventoryItem
  isSelected?: boolean
  onSelect?: () => void
  onFileOpen?: (filePath: string) => void
  fileChanged?: boolean
  isDragging?: boolean
  caseId?: string
}

function getFileIcon(fileType: string) {
  const ext = fileType.toLowerCase()
  if (['pdf'].includes(ext)) return <FileText className="h-4 w-4 flex-shrink-0" />
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <Image className="h-4 w-4 flex-shrink-0" />
  return <File className="h-4 w-4 flex-shrink-0" />
}

export const WorkflowCard = memo(function WorkflowCard({
  item,
  isSelected = false,
  onSelect: _onSelect,
  onFileOpen,
  fileChanged = false,
  isDragging = false,
  caseId,
}: WorkflowCardProps) {
  // Get key mapping fields to display (top 2 priority fields)
  const keyFields = getKeyMappingFields(item, caseId, 2)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDndDragging,
  } = useDraggable({
    id: `file-${item.absolute_path}`,
    data: {
      type: "file",
      item,
    },
  })

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
    // Only handle click if it's a simple click (not part of a drag)
    if (onFileOpen && item.absolute_path) {
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
        "flex flex-col gap-1.5 select-none overflow-hidden"
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
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="text-muted-foreground flex-shrink-0 mt-0.5">
            {getFileIcon(item.file_type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-medium text-foreground truncate leading-tight" title={item.file_name}>
              {item.file_name}
            </h4>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 h-4">
          {item.file_type.toUpperCase()}
        </Badge>
        </div>
      </div>

      {/* Folder Path */}
      {item.folder_name && item.folder_name !== '-' && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
          <Folder className="h-3 w-3 flex-shrink-0" />
          <span className="truncate" title={item.folder_path}>
            {item.folder_name}
          </span>
        </div>
      )}

      {/* Key Mapping Fields */}
      {keyFields.length > 0 && (
        <div className="space-y-1">
          {keyFields.map((field) => (
            <div key={field.columnId} className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
              <span className="font-medium truncate">{field.label}:</span>
              <span className="truncate text-foreground">{formatMappingValue(field.value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map((tag, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="text-[9px] px-1 py-0 h-4"
            >
              {tag}
            </Badge>
          ))}
          {item.tags.length > 2 && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
              +{item.tags.length - 2}
            </Badge>
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
