import { memo } from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { FileText } from "lucide-react"
import { IntegratedFileViewer } from "./IntegratedFileViewer"
import { NotePanel } from "../notes/NotePanel"
import { FindingsPanel } from "../findings/FindingsPanel"
import { TimelineView } from "../timeline/TimelineView"
import { FileDuplicatePanel } from "../duplicates/FileDuplicatePanel"
import type { InventoryItem } from "@/types/inventory"
import { useWorkspacePanels } from "@/hooks/useWorkspacePanels"

interface SplitViewProps {
  viewingFile: InventoryItem | null
  notesVisible: boolean
  findingsVisible: boolean
  timelineVisible: boolean
  duplicatesVisible?: boolean
  caseId: string
  selectedNoteId: string | null
  selectedFindingId?: string | null
  selectedTimelineEventId?: string | null
  navigatorOpen: boolean
  onExpandNavigator: () => void
  onToggleNavigator?: () => void
  onFileClose: () => void
  onNext: () => void
  onPrevious: () => void
  hasNext: boolean
  hasPrevious: boolean
  onFileRefresh: () => void
  onFileRemove: (file: InventoryItem) => void
  onCloseNotes: () => void
  onCloseFindings: () => void
  onCloseTimeline?: () => void
  onCloseDuplicates?: () => void
  onOpenDuplicates?: () => void
}

/**
 * ELITE: Split view component for file viewer + panels layout
 * 
 * Features:
 * - Dynamic panel sizing based on visible panels
 * - Resizable panels with smooth transitions
 * - Integrated file viewer with navigation
 * - Side panels for notes, findings, and timeline
 */
export const SplitView = memo(function SplitView({
  viewingFile,
  notesVisible,
  findingsVisible,
  timelineVisible,
  duplicatesVisible = false,
  caseId,
  selectedNoteId,
  selectedFindingId,
  selectedTimelineEventId,
  navigatorOpen,
  onExpandNavigator,
  onToggleNavigator,
  onFileClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onFileRefresh,
  onFileRemove,
  onCloseNotes,
  onCloseFindings,
  onCloseTimeline,
  onCloseDuplicates,
  onOpenDuplicates,
}: SplitViewProps) {
  const panelSizes = useWorkspacePanels({
    notesVisible,
    findingsVisible,
    timelineVisible,
    duplicatesVisible,
  })

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
    <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
      {/* File Viewer - Takes remaining space */}
      <Panel defaultSize={panelSizes.fileViewerSize} minSize={30}>
        <div className="h-full flex flex-col overflow-hidden">
          {viewingFile ? (
            <IntegratedFileViewer
              file={viewingFile}
              onClose={onFileClose}
              onNext={onNext}
              onPrevious={onPrevious}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              caseId={caseId}
              navigatorOpen={navigatorOpen}
              onExpandNavigator={onExpandNavigator}
              onToggleNavigator={onToggleNavigator}
              onFileRefresh={onFileRefresh}
              onFileRemove={onFileRemove}
              onToggleDuplicates={() => {
                // Toggle duplicates panel - if visible, close it; otherwise open it
                if (duplicatesVisible) {
                  onCloseDuplicates?.();
                } else {
                  onOpenDuplicates?.();
                }
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2 animate-in fade-in-50 duration-300">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </div>
                <p className="text-lg font-medium">No file selected</p>
                <p className="text-sm text-muted-foreground/80">
                  Click a file from the navigator or board to view it
                </p>
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Notes Panel - Resizable right side */}
      {notesVisible && (
        <>
          <ResizeHandle />
          <Panel defaultSize={panelSizes.notesPanelSize} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
              <NotePanel
                caseId={caseId}
                fileId={viewingFile?.id}
                onClose={onCloseNotes}
                initialNoteId={selectedNoteId}
              />
            </div>
          </Panel>
        </>
      )}

      {/* Findings Panel - Resizable right side */}
      {findingsVisible && (
        <>
          <ResizeHandle />
          <Panel defaultSize={panelSizes.findingsPanelSize} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
              <FindingsPanel caseId={caseId} onClose={onCloseFindings} initialFindingId={selectedFindingId} />
            </div>
          </Panel>
        </>
      )}

      {/* Timeline Panel - Resizable right side */}
      {timelineVisible && (
        <>
          <ResizeHandle />
          <Panel defaultSize={panelSizes.timelinePanelSize} minSize={20} maxSize={50}>
            <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
              <TimelineView caseId={caseId} currentFileId={viewingFile?.id} onClose={onCloseTimeline} initialEventId={selectedTimelineEventId} />
            </div>
          </Panel>
        </>
      )}

      {/* Duplicates Panel - Resizable right side - Only show when viewing a file */}
      {duplicatesVisible && viewingFile && (
        <>
          <ResizeHandle />
          <Panel defaultSize={panelSizes.duplicatesPanelSize || 30} minSize={20} maxSize={50}>
            <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
              <FileDuplicatePanel
                caseId={caseId}
                fileId={viewingFile.id!}
                fileName={viewingFile.file_name}
                onClose={onCloseDuplicates}
                onResolved={() => {
                  // Optionally refresh or close panel after resolution
                }}
              />
            </div>
          </Panel>
        </>
      )}
    </PanelGroup>
  )
})

