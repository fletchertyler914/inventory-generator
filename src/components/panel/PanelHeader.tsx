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
    <div className="flex items-center justify-between px-3 py-3 border-b border-border/40 dark:border-border/50 flex-shrink-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreate}
            className={
              createButtonLabel
                ? "h-8 px-3 transition-all duration-200 hover:bg-primary/10 hover:text-primary active:bg-primary/20 active:scale-[0.98]"
                : "h-8 w-8 p-0 transition-all duration-200 hover:bg-primary/10 hover:text-primary active:bg-primary/20 active:scale-[0.98]"
            }
          >
            {createButtonLabel ? (
              <>
                <CreateIcon className="h-4 w-4 mr-1" />
                {createButtonLabel}
              </>
            ) : (
              <CreateIcon className="h-4 w-4" />
            )}
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 active:scale-[0.98]"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

