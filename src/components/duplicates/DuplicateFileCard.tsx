import { CheckCircle2, Star, Trash2 } from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { PanelCard } from "../panel/PanelCard"
import type { DuplicateFile } from "@/services/duplicateService"
import { formatBytes } from "@/lib/inventory-utils"
import { cn } from "@/lib/utils"
import type { FileStatus } from "@/types/inventory"

const statusOptions: { value: FileStatus; label: string; color: string }[] = [
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

interface DuplicateFileCardProps {
  file: DuplicateFile
  isPrimary: boolean
  isRecommended?: boolean
  isViewing?: boolean
  onKeep: () => void
  onDelete: () => void
  recommendationReasons?: string[]
}

export function DuplicateFileCard({
  file,
  isPrimary,
  isRecommended = false,
  isViewing = false,
  onKeep,
  onDelete,
  recommendationReasons: _recommendationReasons,
}: DuplicateFileCardProps) {
  return (
    <PanelCard
      className={cn(
        isPrimary && "border-primary/30 bg-primary/5",
        isRecommended && !isPrimary && "border-primary/20"
      )}
    >
      <div className="space-y-2.5">
        {/* Header with filename and badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold truncate">{file.file_name}</span>
              {isPrimary && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  <Star className="h-2.5 w-2.5 mr-1" />
                  Primary
                </Badge>
              )}
              {isRecommended && !isPrimary && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-primary/50 text-primary"
                >
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Recommended
                </Badge>
              )}
              {isViewing && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Viewing
                </Badge>
              )}
            </div>
            {file.folder_path && (
              <p className="text-xs text-muted-foreground truncate">{file.folder_path}</p>
            )}
          </div>
        </div>

        {/* Essential metadata - compact */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatBytes(file.file_size)}</span>
          <span>•</span>
          {(() => {
            const status = (file.status as FileStatus) || "unreviewed"
            const currentStatus = statusOptions.find(
              (opt) => opt.value === status
            ) || statusOptions[0]
            if (!currentStatus) return null
            return (
              <span className={cn("text-xs", currentStatus.color)}>
                {currentStatus.label}
              </span>
            )
          })()}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
          {!isPrimary ? (
            <>
              <Button variant="default" size="sm" onClick={onKeep} className="flex-1 text-xs h-7">
                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                Keep
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">This is the primary file</div>
          )}
        </div>
      </div>
    </PanelCard>
  )
}
