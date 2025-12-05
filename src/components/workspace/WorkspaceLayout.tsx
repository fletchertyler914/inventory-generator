import { memo } from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { Button } from "../ui/button"
import { ChevronRight } from "lucide-react"
import { FileNavigator } from "./FileNavigator"
import { SplitView } from "./SplitView"
import { BoardView } from "./BoardView"
import type { InventoryItem } from "@/types/inventory"

interface WorkspaceLayoutProps {
  viewMode: "split" | "board"
  navigatorOpen: boolean
  items: InventoryItem[]
  viewingFile: InventoryItem | null
  filteredItems: InventoryItem[]
  selectedFolderPath: string | null
  selectedIndices: number[]
  notesVisible: boolean
  findingsVisible: boolean
  timelineVisible: boolean
  duplicatesVisible?: boolean
  caseId: string
  selectedNoteId: string | null
  selectedFindingId?: string | null
  selectedTimelineEventId?: string | null
  onFileSelect: (file: InventoryItem) => void
  onFolderSelect: (folderPath: string | null) => void
  onToggleNavigator: () => void
  onExpandNavigator: () => void
  onFileRemove: (file: InventoryItem) => void
  onItemsChange: (items: InventoryItem[]) => void
  onSelectionChange: (indices: number[]) => void
  onFileOpen: (filePath: string) => void
  onFileClose: () => void
  onNext: () => void
  onPrevious: () => void
  hasNext: boolean
  hasPrevious: boolean
  onFileRefresh: () => void
  onCloseNotes: () => void
  onCloseFindings: () => void
  onCloseTimeline?: () => void
  onCloseDuplicates?: () => void
  onOpenDuplicates?: () => void
}

/**
 * ELITE: Workspace layout component
 * 
 * Handles PanelGroup structure and renders appropriate view based on mode
 * Manages navigator visibility and resizing
 */
export const WorkspaceLayout = memo(function WorkspaceLayout({
  viewMode,
  navigatorOpen,
  items,
  viewingFile,
  filteredItems,
  selectedFolderPath,
  selectedIndices,
  notesVisible,
  findingsVisible,
  timelineVisible,
  duplicatesVisible,
  caseId,
  selectedNoteId,
  selectedFindingId,
  selectedTimelineEventId,
  onFileSelect,
  onFolderSelect,
  onToggleNavigator,
  onExpandNavigator,
  onFileRemove,
  onItemsChange,
  onSelectionChange,
  onFileOpen,
  onFileClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onFileRefresh,
  onCloseNotes,
  onCloseFindings,
  onCloseTimeline,
  onCloseDuplicates,
  onOpenDuplicates,
}: WorkspaceLayoutProps) {
  // Reusable resize handle component
  const ResizeHandle = () => (
    <PanelResizeHandle className="group w-1.5 bg-transparent hover:bg-border/30 transition-colors duration-200 cursor-col-resize relative flex items-center justify-center">
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/60 transition-colors" />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
        <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
        <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
      </div>
    </PanelResizeHandle>
  )

  return (
    <PanelGroup direction="horizontal" className="flex-1 overflow-hidden min-h-0">
      {/* Left Sidebar - File Navigator (resizable) */}
      {navigatorOpen && (
        <>
          <Panel
            defaultSize={30}
            minSize={20}
            maxSize={40}
            className="flex flex-col overflow-hidden"
          >
            <div className="h-full bg-card flex flex-col" style={{ minWidth: '240px' }}>
              <FileNavigator
                items={items}
                currentFile={viewingFile}
                onFileSelect={onFileSelect}
                selectedFolderPath={selectedFolderPath}
                onFolderSelect={onFolderSelect}
                navigatorOpen={navigatorOpen}
                onToggleNavigator={onToggleNavigator}
                onFileRemove={onFileRemove}
                caseId={caseId}
              />
            </div>
          </Panel>
          <ResizeHandle />
        </>
      )}

      {/* Toggle Button - When Sidebar is Collapsed */}
      {!navigatorOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onExpandNavigator}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-r border-l-0 border border-border/40 dark:border-border/50 bg-background hover:bg-muted transition-colors duration-150"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Center/Right - Review Mode or Board View */}
      <Panel className="flex flex-col overflow-hidden min-h-0 relative">
        {viewMode === "split" ? (
          <SplitView
            viewingFile={viewingFile}
            notesVisible={notesVisible}
            findingsVisible={findingsVisible}
            timelineVisible={timelineVisible}
            duplicatesVisible={duplicatesVisible}
            caseId={caseId}
            selectedNoteId={selectedNoteId}
            selectedFindingId={selectedFindingId}
            selectedTimelineEventId={selectedTimelineEventId}
            onFileClose={onFileClose}
            onNext={onNext}
            onPrevious={onPrevious}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            onFileRefresh={onFileRefresh}
            onFileRemove={onFileRemove}
            onCloseNotes={onCloseNotes}
            onCloseFindings={onCloseFindings}
            onCloseTimeline={onCloseTimeline}
            onCloseDuplicates={onCloseDuplicates}
            onOpenDuplicates={onOpenDuplicates}
          />
        ) : (
          <BoardView
            items={items}
            filteredItems={filteredItems}
            navigatorOpen={navigatorOpen}
            selectedIndices={selectedIndices}
            selectedFolderPath={selectedFolderPath}
            onItemsChange={onItemsChange}
            onSelectionChange={onSelectionChange}
            onFileOpen={onFileOpen}
            onFileRemove={onFileRemove}
            caseId={caseId}
          />
        )}
      </Panel>
    </PanelGroup>
  )
})

