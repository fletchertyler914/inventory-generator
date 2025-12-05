import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface PanelCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  pinned?: boolean
}

export const PanelCard = forwardRef<HTMLDivElement, PanelCardProps>(
  function PanelCard({ children, onClick, className, pinned }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "p-3 rounded-md border bg-background hover:bg-muted/40 transition-all duration-200",
          "border-border/40 dark:border-border/50 hover:border-border/60 dark:hover:border-border/70",
          "min-w-0 overflow-hidden",
          "[&_*]:pointer-events-auto [&_button]:pointer-events-auto [&_a]:pointer-events-auto",
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
)

