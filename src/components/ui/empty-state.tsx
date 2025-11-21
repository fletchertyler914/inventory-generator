import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-32 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-card">
            <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>
      )}
      <h3 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-base text-muted-foreground/80 max-w-md mb-8 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
