import { InventoryTable } from "../InventoryTable"
import { TableSkeleton } from "../TableSkeleton"
import { EmptyState } from "../ui/empty-state"
import { RecentInventories } from "../RecentInventories"
import { NotePanel } from "../notes/NotePanel"
import { TimelineView } from "../timeline/TimelineView"
import { ProgressDashboard } from "../dashboard/ProgressDashboard"
import { FolderOpen, FileText, List, Calendar } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
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
  onFileOpen?: ((filePath: string) => void) | undefined
  currentCaseId?: string | undefined
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
  onFileOpen,
  currentCaseId,
}: TableContentProps) {
  const [notesPanelOpen, setNotesPanelOpen] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>()
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table')
  const [showProgressDashboard] = useState<boolean>(true)
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
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-0.5">
              {viewMode === 'table' ? 'Inventory Table' : 'Case Timeline'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedFolder && `Viewing files from: ${selectedFolder.split('/').pop()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('timeline')}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Timeline
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container - Responsive */}
      <div className="flex-1 overflow-hidden min-h-0 min-w-0 flex">
        <div className={notesPanelOpen ? "flex-1 overflow-hidden min-h-0 min-w-0 flex flex-col" : "flex-1 overflow-hidden min-h-0 min-w-0 flex flex-col"}>
          {viewMode === 'table' ? (
            <div className="flex-1 overflow-hidden p-6 min-h-0 min-w-0 flex flex-col">
              {/* Progress Dashboard Section */}
              {items.length > 0 && showProgressDashboard && (
                <div className="flex-shrink-0 overflow-hidden">
                  <ProgressDashboard items={items} />
                </div>
              )}
              {/* Inventory Table - Takes remaining space */}
              <div className="flex-1 overflow-hidden min-h-0 min-w-0">
                <InventoryTable 
                  items={items} 
                  onItemsChange={onItemsChange} 
                  onSelectionChange={onSelectionChange}
                  selectedIndices={selectedIndices}
                  onFileOpen={(path) => {
                    if (onFileOpen) {
                      onFileOpen(path)
                    }
                    // Also open notes panel for the file
                    if (currentCaseId) {
                      const file = items.find(item => item.absolute_path === path)
                      if (file) {
                        // Use file ID from database (cloud-ready UUID)
                        setSelectedFileId(file.id)
                        setNotesPanelOpen(true)
                      }
                    }
                  }}
                />
              </div>
            </div>
          ) : currentCaseId ? (
            <TimelineView caseId={currentCaseId} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={Calendar}
                title="No case selected"
                description="Select a case to view the timeline"
              />
            </div>
          )}
        </div>
        {notesPanelOpen && currentCaseId && viewMode === 'table' && (
          <div className="w-80 border-l border-border flex-shrink-0">
            <NotePanel
              caseId={currentCaseId}
              fileId={selectedFileId || undefined}
              onClose={() => setNotesPanelOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
