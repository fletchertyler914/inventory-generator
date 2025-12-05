import { memo, lazy, Suspense } from "react"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "../ui/button"
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
  onExpandNavigator?: () => void
  onToggleNavigator?: () => void
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
  onExpandNavigator,
  onToggleNavigator,
  selectedIndices,
  selectedFolderPath,
  onItemsChange,
  onSelectionChange,
  onFileOpen,
  onFileRemove,
  caseId,
}: BoardViewProps) {
  const isFiltered = selectedFolderPath !== null
  const folderName = selectedFolderPath
    ? selectedFolderPath.split("/").pop() || selectedFolderPath
    : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="px-4 pt-3 pb-3 border-b border-border/40 dark:border-border/50 flex-shrink-0">
        {/* Header Row - Title and Toggle */}
        <div className="flex items-center gap-2 mb-3">
          {(onToggleNavigator || onExpandNavigator) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={navigatorOpen ? onToggleNavigator : onExpandNavigator}
              className="h-8 w-8 flex-shrink-0"
              title={navigatorOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {navigatorOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold">Workflow Board</h2>
            {isFiltered && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredItems.length} of {items.length} files from "{folderName}"
              </p>
            )}
          </div>
        </div>

        {/* Progress Section */}
        {items.length > 0 && (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <LazyProgressDashboard items={items} />
          </Suspense>
        )}
      </div>
      <div className={cn("flex-1 overflow-hidden min-h-0 min-w-0 mr-8")}>
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
