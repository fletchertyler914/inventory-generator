import type { LucideIcon } from "lucide-react"
import { Button } from "../ui/button"

interface PanelEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function PanelEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: PanelEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {onAction ? (
        <Button
          onClick={onAction}
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-muted/30 hover:bg-muted/50"
        >
          <Icon className="h-5 w-5 text-muted-foreground/60" />
        </Button>
      ) : (
        <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-muted-foreground/60" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground mb-1.5">{title}</p>
      <p className="text-xs text-muted-foreground/80 max-w-[200px]">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="link"
          className="mt-4 text-xs"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

