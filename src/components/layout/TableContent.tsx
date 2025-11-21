import { InventoryTable } from "../InventoryTable"
import { TableSkeleton } from "../TableSkeleton"
import { EmptyState } from "../ui/empty-state"
import { RecentInventories } from "../RecentInventories"
import { FolderOpen, FileText } from "lucide-react"
import type { InventoryItem } from "@/types/inventory"
import type { RecentInventory } from "@/hooks/useRecentInventories"

interface TableContentProps {
  items: InventoryItem[]
  onItemsChange: (items: InventoryItem[]) => void
  onSelectionChange?: ((indices: number[]) => void) | undefined
  selectedIndices?: number[]
  loading: boolean
  selectedFolder: string | null
  recentInventories?: RecentInventory[]
  onOpenRecentInventory?: ((inventory: RecentInventory) => void) | undefined
  onRemoveRecentInventory?: ((id: string) => void) | undefined
}

export function TableContent({
  items,
  onItemsChange,
  onSelectionChange,
  selectedIndices,
  loading,
  selectedFolder,
  recentInventories = [],
  onOpenRecentInventory,
  onRemoveRecentInventory,
}: TableContentProps) {
  if (loading) {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden bg-background">
        {/* Table Header */}
        <div className="px-6 pt-5 pb-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-0.5">
                Inventory Table
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedFolder && `Scanning: ${selectedFolder.split('/').pop()}...`}
              </p>
            </div>
          </div>
        </div>

        {/* Table Container with Skeleton */}
        <div className="flex-1 overflow-hidden p-6 min-h-0 min-w-0">
          <div className="h-full w-full">
            <TableSkeleton rowCount={15} />
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0 && selectedFolder) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState
          icon={FileText}
          title="No files found"
          description="No files were found in the selected folder. Try selecting a different directory."
        />
      </div>
    )
  }

  if (items.length === 0 && !selectedFolder) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl flex flex-col items-center">
          {/* Centered Getting Started Section */}
          <div className="flex flex-col items-center justify-center mb-12">
            <EmptyState
              icon={FolderOpen}
              title="Get Started"
              description="Select a folder from the sidebar to begin scanning and generating your document inventory"
            />
          </div>
          
          {/* Recent Inventories - Faint Display Below */}
          {recentInventories.length > 0 && (
            <div className="w-full max-w-md opacity-50 hover:opacity-75 transition-opacity">
              <RecentInventories
                recentInventories={recentInventories}
                onOpenInventory={onOpenRecentInventory || (() => {})}
                onRemoveInventory={onRemoveRecentInventory || (() => {})}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      {/* Table Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-0.5">
              Inventory Table
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedFolder && `Viewing files from: ${selectedFolder.split('/').pop()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Table Container - Responsive */}
      <div className="flex-1 overflow-hidden p-6 min-h-0 min-w-0 flex flex-col">
          <InventoryTable 
            items={items} 
            onItemsChange={onItemsChange} 
            onSelectionChange={onSelectionChange}
            selectedIndices={selectedIndices}
          />
      </div>
    </div>
  )
}
