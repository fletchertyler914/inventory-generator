import { cn } from "@/lib/utils"

interface PanelCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  pinned?: boolean
}

export function PanelCard({ children, onClick, className, pinned }: PanelCardProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-md border bg-background hover:bg-muted/40 transition-all duration-200",
        "border-border/40 dark:border-border/50 hover:border-border/60 dark:hover:border-border/70",
        "min-w-0 overflow-hidden",
        onClick && "cursor-pointer",
        pinned && "bg-muted/10 border-primary/30 dark:border-primary/40",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

