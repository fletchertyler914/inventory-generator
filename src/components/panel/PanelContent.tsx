import { ScrollArea } from "../ui/scroll-area"
import { cn } from "@/lib/utils"

interface PanelContentProps {
  children: React.ReactNode
  className?: string
}

export function PanelContent({ children, className }: PanelContentProps) {
  return (
    <ScrollArea className={cn("flex-1 min-h-0", className)}>
      <div className="p-2 space-y-2.5">{children}</div>
    </ScrollArea>
  )
}

