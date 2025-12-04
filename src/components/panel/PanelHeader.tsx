import { Plus, X } from "lucide-react"
import { Button } from "../ui/button"
import type { LucideIcon } from "lucide-react"

interface PanelHeaderProps {
  title: string
  count?: number
  onCreate?: () => void
  createButtonLabel?: string
  createButtonIcon?: LucideIcon
  onClose?: () => void
}

export function PanelHeader({
  title,
  count,
  onCreate,
  createButtonLabel = "New",
  createButtonIcon: CreateIcon = Plus,
  onClose,
}: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onCreate && (
          <Button variant="outline" size="sm" onClick={onCreate}>
            <CreateIcon className="h-4 w-4 mr-1" />
            {createButtonLabel}
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

