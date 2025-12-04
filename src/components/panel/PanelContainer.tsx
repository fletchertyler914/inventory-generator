import { cn } from "@/lib/utils"

interface PanelContainerProps {
  children: React.ReactNode
  className?: string
}

export function PanelContainer({ children, className }: PanelContainerProps) {
  return (
    <div className={cn("h-full flex flex-col bg-card", className)}>
      {children}
    </div>
  )
}

