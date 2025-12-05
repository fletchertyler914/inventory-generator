import { useState, useCallback, useEffect, useMemo, memo, lazy, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { CaseHeader } from "./CaseHeader"
import { WorkspaceLayout } from "./WorkspaceLayout"
import { ReportGenerator } from "../reports/ReportGenerator"
import { useWorkspacePreferences } from "@/hooks/useWorkspacePreferences"
import { useWorkspaceAutoSync } from "@/hooks/useWorkspaceAutoSync"
import { useFileNavigation } from "@/hooks/useFileNavigation"
import { noteService } from "@/services/noteService"
import { fileService } from "@/services/fileService"
import { toast } from "@/hooks/useToast"
import type { Case } from "@/types/case"
import type { InventoryItem } from "@/types/inventory"

// Lazy load heavy components for better initial load performance
const LazyReportView = lazy(() =>
  import("../reports/ReportView").then((m) => ({ default: m.ReportView }))
)

// Export LazyWorkflowBoard for use in BoardView
export const LazyWorkflowBoard = lazy(() =>
  import("../board/WorkflowBoard").then((m) => ({ default: m.WorkflowBoard }))
)

interface CaseWorkspaceProps {
  case: Case
  items: InventoryItem[]
  onItemsChange: (items: InventoryItem[]) => void
  selectedIndices: number[]
  onSelectionChange: (indices: number[]) => void
  loading: boolean
  onCloseCase: () => void
  onAddFiles: (path: string) => void
  onBulkUpdate: (updates: Partial<InventoryItem>, indices?: number[]) => void
}

export type TableFilter =
  | "unreviewed"
  | "in_progress"
  | "reviewed"
  | "flagged"
  | "finalized"
  | "all"

/**
 * CaseWorkspace - Integrated Multi-Pane Layout
 *
 * ELITE ARCHITECTURE:
 * - Modular hooks for state management
 * - Separated components for layout concerns
 * - Optimized performance with proper memoization
 * - Clean separation of concerns
 */
export const CaseWorkspace = memo(
  function CaseWorkspace({
    case: case_,
    items,
    onItemsChange,
    selectedIndices,
    onSelectionChange,
    onCloseCase,
    onAddFiles,
  }: CaseWorkspaceProps) {
    // Workspace preferences hook
    const {
      preferences,
      preferencesLoaded,
      setViewMode,
      toggleReportMode,
      toggleNotes,
      toggleFindings,
      toggleTimeline,
      toggleNavigator,
      setNavigatorOpen,
      toggleAutoSync,
      setNotesVisible,
      setFindingsVisible,
      setTimelineVisible,
      setDuplicatesVisible,
    } = useWorkspacePreferences(case_.id)

    // File navigation hook
    const {
      viewingFile,
      selectedNoteId,
      setSelectedNoteId,
      handleFileSelect,
      handleFileClose,
      handleFileOpen,
      handleNextFile,
      handlePreviousFile,
      hasNext,
      hasPrevious,
    } = useFileNavigation({
      caseId: case_.id,
      items,
      preferencesLoaded,
      viewMode: preferences.view_mode,
      onViewModeChange: setViewMode,
    })

    // Auto-sync hook
    const { isSyncing, handleSyncFiles } = useWorkspaceAutoSync({
      caseId: case_.id,
      enabled: preferences.auto_sync_enabled ?? true,
      intervalMinutes: preferences.auto_sync_interval_minutes ?? 5,
      preferencesLoaded,
      onItemsChange,
    })

    // Local state
    const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null)
    const [reportDialogOpen, setReportDialogOpen] = useState<boolean>(false)

    // Filter items based on folder
    // Normalize folder paths for consistent comparison (handle null/undefined/empty)
    const filteredItems = useMemo(() => {
      let filtered = [...items]
      if (selectedFolderPath) {
        // Normalize both the selected path and item paths for comparison
        const normalizedSelectedPath = selectedFolderPath.trim()
        filtered = filtered.filter((item) => {
          const itemPath = (item.folder_path || "").trim()
          return itemPath === normalizedSelectedPath
        })
      }
      return filtered
    }, [items, selectedFolderPath])

    // File operations
    const handleFileRemove = useCallback(
      async (file: InventoryItem) => {
        if (!file.id || !case_.id) {
          toast({
            title: "Cannot remove file",
            description: "File ID or case ID is missing",
            variant: "destructive",
          })
          return
        }

        try {
          await fileService.removeFileFromCase(file.id, case_.id)
          const updatedItems = items.filter((item) => item.id !== file.id)
          onItemsChange(updatedItems)

          if (viewingFile?.id === file.id) {
            handleFileClose()
          }

          toast({
            title: "File removed",
            description: `${file.file_name} has been removed from the case`,
            variant: "success",
          })
        } catch (error) {
          toast({
            title: "Failed to remove file",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          })
        }
      },
      [case_.id, items, onItemsChange, viewingFile, handleFileClose]
    )

    const handleFileRefresh = useCallback(async () => {
      try {
        const refreshedItems = await fileService.loadCaseFilesWithInventory(case_.id, true)
        onItemsChange(refreshedItems)
      } catch (error) {
        console.error("Failed to reload files after refresh:", error)
      }
    }, [case_.id, onItemsChange])

    const handleAddFilesClick = useCallback(async () => {
      const { open } = await import("@tauri-apps/plugin-dialog")
      try {
        const selected = await open({
          multiple: true,
          title: "Select files to add",
        })
        if (selected) {
          const paths = Array.isArray(selected) ? selected : [selected]
          for (const path of paths) {
            if (typeof path === "string") {
              onAddFiles(path)
            }
          }
        }
      } catch {
        // User cancelled
      }
    }, [onAddFiles])

    const handleAddFoldersClick = useCallback(async () => {
      const { open } = await import("@tauri-apps/plugin-dialog")
      try {
        const selected = await open({
          directory: true,
          multiple: true,
          title: "Select folders to add",
        })
        if (selected) {
          const paths = Array.isArray(selected) ? selected : [selected]
          for (const path of paths) {
            if (typeof path === "string") {
              onAddFiles(path)
            }
          }
        }
      } catch {
        // User cancelled
      }
    }, [onAddFiles])

    // Note selection handler
    const handleNoteSelect = useCallback(
      async (noteId: string) => {
        setSelectedNoteId(noteId)
        if (!preferences.notes_visible) {
          setNotesVisible(true)
        }
        if (preferences.view_mode !== "split") {
          setViewMode("split")
        }

        // If the note is associated with a file, also select that file
        try {
          const notes = await noteService.listNotes(case_.id)
          const note = notes.find((n) => n.id === noteId)
          if (note?.file_id) {
            const file = items.find((item) => item.id === note.file_id)
            if (file) {
              handleFileSelect(file)
            }
          }
        } catch (error) {
          console.error("Failed to fetch note for file selection:", error)
        }
      },
      [
        preferences.notes_visible,
        preferences.view_mode,
        case_.id,
        items,
        handleFileSelect,
        setNotesVisible,
        setViewMode,
        setSelectedNoteId,
      ]
    )

    const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)

    const handleFindingSelect = useCallback(
      async (filePath?: string, findingId?: string) => {
        setSelectedNoteId(null)
        setFindingsVisible(true)
        setViewMode("split")

        // Set the finding ID to open it in the panel
        if (findingId) {
          setSelectedFindingId(findingId)
        }

        // If a file path is provided, navigate to that file
        if (filePath) {
          handleFileOpen(filePath)
        }
      },
      [setFindingsVisible, setViewMode, setSelectedNoteId, handleFileOpen]
    )

    const [selectedTimelineEventId, setSelectedTimelineEventId] = useState<string | null>(null)

    const handleTimelineSelect = useCallback(
      async (filePath?: string, timelineEventId?: string) => {
        setSelectedNoteId(null)
        if (!preferences.timeline_visible) {
          toggleTimeline()
        }
        if (preferences.view_mode !== "split" && viewingFile) {
          setViewMode("split")
        } else if (preferences.view_mode !== "split" && !viewingFile) {
          toggleTimeline()
        }

        // Set the timeline event ID to scroll to it in the panel
        if (timelineEventId) {
          setSelectedTimelineEventId(timelineEventId)
        }

        // If a file path is provided, navigate to that file
        if (filePath) {
          handleFileOpen(filePath)
        }
      },
      [
        preferences.timeline_visible,
        preferences.view_mode,
        viewingFile,
        setViewMode,
        toggleTimeline,
        setSelectedNoteId,
        handleFileOpen,
      ]
    )

    const handleSearchChange = useCallback((_query: string) => {
      // Search query is handled by SearchDialog component
    }, [])

    // Keyboard shortcuts for pane toggles
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        const isInput =
          target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

        if (isInput) return

        const modifier =
          navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? e.metaKey : e.ctrlKey

        // Cmd/Ctrl + N: Toggle notes
        if (modifier && e.key.toLowerCase() === "n") {
          e.preventDefault()
          toggleNotes()
          return
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleNotes])

    // Close notes when file is closed
    useEffect(() => {
      if (!viewingFile && preferences.notes_visible) {
        setNotesVisible(false)
      }
    }, [viewingFile, preferences.notes_visible, setNotesVisible])

    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <CaseHeader
          case={case_}
          fileCount={items.length}
          items={items}
          onClose={onCloseCase}
          onAddFiles={handleAddFilesClick}
          onAddFolders={handleAddFoldersClick}
          viewMode={preferences.view_mode}
          viewingFile={viewingFile}
          reportMode={preferences.report_mode}
          onToggleReportMode={toggleReportMode}
          notesVisible={preferences.notes_visible}
          onToggleNotes={toggleNotes}
          findingsVisible={preferences.findings_visible}
          onToggleFindings={toggleFindings}
          timelineVisible={preferences.timeline_visible}
          onToggleTimeline={toggleTimeline}
          onFileOpen={handleFileOpen}
          onSearchChange={handleSearchChange}
          onNoteSelect={handleNoteSelect}
          onFindingSelect={handleFindingSelect}
          onTimelineSelect={handleTimelineSelect}
          onSyncFiles={handleSyncFiles}
          isSyncing={isSyncing}
          autoSyncEnabled={preferences.auto_sync_enabled ?? true}
          onToggleAutoSync={toggleAutoSync}
        />

        {/* Main Content Area */}
        {preferences.report_mode ? (
          /* Report Mode - Full screen ReportView */
          <div className="flex-1 overflow-hidden min-h-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <LazyReportView case_={case_} items={items} onToggleReportMode={toggleReportMode} />
            </Suspense>
          </div>
        ) : (
          /* Review Mode - Show split/board views */
          <WorkspaceLayout
            viewMode={preferences.view_mode}
            navigatorOpen={preferences.navigator_open}
            items={items}
            viewingFile={viewingFile}
            filteredItems={filteredItems}
            selectedFolderPath={selectedFolderPath}
            selectedIndices={selectedIndices}
            notesVisible={preferences.notes_visible}
            findingsVisible={preferences.findings_visible}
            timelineVisible={preferences.timeline_visible}
            duplicatesVisible={preferences.duplicates_visible ?? false}
            caseId={case_.id}
            selectedNoteId={selectedNoteId}
            selectedFindingId={selectedFindingId}
            selectedTimelineEventId={selectedTimelineEventId}
            onFileSelect={handleFileSelect}
            onFolderSelect={setSelectedFolderPath}
            onToggleNavigator={toggleNavigator}
            onExpandNavigator={() => setNavigatorOpen(true)}
            onFileRemove={handleFileRemove}
            onItemsChange={onItemsChange}
            onSelectionChange={onSelectionChange}
            onFileOpen={handleFileOpen}
            onFileClose={handleFileClose}
            onNext={handleNextFile}
            onPrevious={handlePreviousFile}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            onFileRefresh={handleFileRefresh}
            onCloseNotes={() => setNotesVisible(false)}
            onCloseFindings={() => setFindingsVisible(false)}
            onCloseTimeline={() => setTimelineVisible(false)}
            onCloseDuplicates={() => setDuplicatesVisible(false)}
            onOpenDuplicates={() => setDuplicatesVisible(true)}
          />
        )}

        {/* Report Generator Dialog */}
        <ReportGenerator
          items={items}
          case_={case_}
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
        />
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom memoization comparison for optimal performance
    return (
      prevProps.case.id === nextProps.case.id &&
      prevProps.case.name === nextProps.case.name &&
      prevProps.items === nextProps.items &&
      prevProps.selectedIndices === nextProps.selectedIndices &&
      prevProps.loading === nextProps.loading &&
      prevProps.onItemsChange === nextProps.onItemsChange &&
      prevProps.onSelectionChange === nextProps.onSelectionChange &&
      prevProps.onCloseCase === nextProps.onCloseCase &&
      prevProps.onAddFiles === nextProps.onAddFiles &&
      prevProps.onBulkUpdate === nextProps.onBulkUpdate
    )
  }
)
