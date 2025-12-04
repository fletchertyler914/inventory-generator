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
        "p-3 rounded-md border border-border/30 hover:border-border/60 bg-background hover:bg-muted/40 transition-all duration-200",
        onClick && "cursor-pointer",
        pinned && "bg-muted/10 border-primary/20",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

