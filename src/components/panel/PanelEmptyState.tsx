import type { LucideIcon } from "lucide-react"

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
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 text-xs text-primary hover:text-primary/80 underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

