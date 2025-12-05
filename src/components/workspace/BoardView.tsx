import { memo, lazy, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { InventoryItem } from "@/types/inventory"

// Lazy load heavy components
const LazyProgressDashboard = lazy(() =>
  import("../dashboard/ProgressDashboard").then((m) => ({ default: m.ProgressDashboard }))
)
const LazyWorkflowBoard = lazy(() =>
  import("../board/WorkflowBoard").then((m) => ({ default: m.WorkflowBoard }))
)

interface BoardViewProps {
  items: InventoryItem[]
  filteredItems: InventoryItem[]
  navigatorOpen: boolean
  selectedIndices: number[]
  selectedFolderPath: string | null
  onItemsChange: (items: InventoryItem[]) => void
  onSelectionChange: (indices: number[]) => void
  onFileOpen: (filePath: string) => void
  onFileRemove: (file: InventoryItem) => void
  caseId: string
}

/**
 * ELITE: Board view component for workflow board layout
 * 
 * Features:
 * - Full-width workflow board for optimal experience
 * - Progress dashboard showing review statistics
 * - Lazy-loaded components for performance
 */
export const BoardView = memo(function BoardView({
  items,
  filteredItems,
  navigatorOpen,
  selectedIndices,
  selectedFolderPath,
  onItemsChange,
  onSelectionChange,
  onFileOpen,
  onFileRemove,
  caseId,
}: BoardViewProps) {
  const isFiltered = selectedFolderPath !== null
  const folderName = selectedFolderPath ? selectedFolderPath.split("/").pop() || selectedFolderPath : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="px-4 pt-4 pb-3 border-b border-border/40 dark:border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold mb-1">Workflow Board</h2>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {isFiltered
                  ? `Showing ${filteredItems.length} of ${items.length} files from folder "${folderName}"`
                  : "Organize and track files through review stages"}
              </p>
              {isFiltered && (
                <p className="text-xs text-muted-foreground/70 italic">
                  Click a folder in the navigator to filter, or click "All Files" to show all case files
                </p>
              )}
            </div>
          </div>
        </div>
        {items.length > 0 && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <LazyProgressDashboard items={items} />
          </Suspense>
        )}
      </div>
      <div
        className={cn(
          "flex-1 overflow-hidden min-h-0 min-w-0",
          !navigatorOpen && "pl-8"
        )}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <LazyWorkflowBoard
            items={filteredItems}
            onItemsChange={onItemsChange}
            selectedIndices={selectedIndices}
            onSelectionChange={onSelectionChange}
            onFileOpen={onFileOpen}
            onFileRemove={onFileRemove}
            statusFilter="all"
            totalFiles={items.length}
            caseId={caseId}
          />
        </Suspense>
      </div>
    </div>
  )
})

