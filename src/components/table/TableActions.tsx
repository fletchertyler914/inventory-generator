import { memo } from "react"
import { Button } from "../ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TableActionsProps {
  selectedCount: number
  onClearSelection: () => void
  actions?: React.ReactNode
  className?: string
}

function TableActionsComponent({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: TableActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        "sticky bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-border/40 dark:border-border/50 bg-card px-4 py-2.5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-foreground">
          {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 text-xs"
        >
          <X className="mr-1.5 h-3 w-3" />
          Clear
        </Button>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export const TableActions = memo(TableActionsComponent)
