import { FileText, Clock, X, FolderOpen } from "lucide-react"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { RecentInventory } from "@/hooks/useRecentInventories"

interface RecentInventoriesProps {
  recentInventories: RecentInventory[]
  onOpenInventory: (inventory: RecentInventory) => void
  onRemoveInventory: (id: string) => void
  className?: string
}

export function RecentInventories({
  recentInventories,
  onOpenInventory,
  onRemoveInventory,
  className,
}: RecentInventoriesProps) {
  if (recentInventories.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Recent Inventories
        </h3>
        <span className="text-xs text-muted-foreground">
          {recentInventories.length} {recentInventories.length === 1 ? "file" : "files"}
        </span>
      </div>
      
      <div className="grid gap-2.5">
        {recentInventories.map((inventory) => (
          <Card
            key={inventory.id}
            className="group relative p-3 border border-border bg-card hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 cursor-pointer"
            onClick={() => onOpenInventory(inventory)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {inventory.name}
                    </h4>
                    {inventory.caseNumber && (
                      <Badge variant="outline" className="mt-1 text-[10px] font-medium">
                        {inventory.caseNumber}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    <span>{inventory.itemCount} item{inventory.itemCount !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(inventory.lastOpened), { addSuffix: true })}</span>
                  </div>
                  {inventory.folderPath && (
                    <div className="flex items-center gap-1.5">
                      <FolderOpen className="h-3 w-3" />
                      <span className="truncate max-w-[120px]" title={inventory.folderPath}>
                        {inventory.folderPath.split(/[/\\]/).pop()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveInventory(inventory.id)
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

