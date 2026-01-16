import { useState, useCallback, useEffect, useMemo, memo, lazy, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { CaseHeader } from "./CaseHeader"
import { WorkspaceLayout } from "./WorkspaceLayout"
import { useWorkspacePreferences } from "@/hooks/useWorkspacePreferences"
import { useWorkspaceAutoSync } from "@/hooks/useWorkspaceAutoSync"
import { useFileNavigation } from "@/hooks/useFileNavigation"
import { noteService } from "@/services/noteService"
import { fileService } from "@/services/fileService"
import { timeService } from "@/services/timeService"
import { getStartOfDayTimestamp } from "@/lib/time-utils"
import { toast } from "@/hooks/useToast"
import type { Case } from "@/types/case"
import type { InventoryItem } from "@/types/inventory"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"
import { TimeManagementPage } from "../time/TimeManagementPage"
import { clearServiceCache } from "@/services/baseService"
import { logError } from "@/lib/logger"

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
    const [showTimerStartDialog, setShowTimerStartDialog] = useState(false)
    const [showTimerStopDialog, setShowTimerStopDialog] = useState(false)
    const [showTimeManagement, setShowTimeManagement] = useState(false)

    // Filter items based on folder
    // Normalize folder paths for consistent comparison (handle null/undefined/empty)
    // Recursively includes files in the selected folder and all its subfolders
    const filteredItems = useMemo(() => {
      let filtered = [...items]
      if (selectedFolderPath) {
        // Normalize both the selected path and item paths for comparison
        const normalizedSelectedPath = selectedFolderPath.trim()
        filtered = filtered.filter((item) => {
          const itemPath = (item.folder_path || "").trim()
          // Match files directly in the selected folder OR in any subfolder
          // The "/" separator ensures we only match descendants, not parent/sibling folders
          return (
            itemPath === normalizedSelectedPath || itemPath.startsWith(normalizedSelectedPath + "/")
          )
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
        logError("Failed to reload files after refresh", error)
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
          logError("Failed to fetch note for file selection", error)
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

        // Cmd/Ctrl + F: Toggle findings panel
        if (modifier && e.key.toLowerCase() === "f") {
          e.preventDefault()
          toggleFindings()
          return
        }

        // Cmd/Ctrl + T: Toggle timeline panel
        if (modifier && e.key.toLowerCase() === "t") {
          e.preventDefault()
          toggleTimeline()
          return
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleNotes, toggleFindings, toggleTimeline])

    // Close notes when file is closed
    useEffect(() => {
      if (!viewingFile && preferences.notes_visible) {
        setNotesVisible(false)
      }
    }, [viewingFile, preferences.notes_visible, setNotesVisible])

    // Auto-start timer logic when case opens
    useEffect(() => {
      if (!preferencesLoaded || !case_.id) return

      const checkAndStartTimer = async () => {
        try {
          // Clear cache to ensure we get fresh data
          clearServiceCache("get_active_timer")

          // Check if timer is already running in database (single source of truth)
          const activeTimer = await timeService.getActiveTimer(case_.id)

          if (activeTimer) {
            // Timer already running, no action needed - don't show dialog
            return
          }

          // Check if there's a time entry for today
          const today = getStartOfDayTimestamp(Date.now() / 1000)
          clearServiceCache("get_time_entry")
          const todayEntry = await timeService.getTimeEntry(case_.id, today)

          if (!todayEntry) {
            // No entry for today - show confirmation dialog (prompt only, never auto-start)
            setShowTimerStartDialog(true)
          }
          // If entry exists, do nothing - timer should only be started manually or via prompt
        } catch (error) {
          // Silently fail - timer is not critical
          logError("Failed to check/start timer on case open", error)
        }
      }

      // Delay the check slightly to allow timer widget to initialize
      const timeoutId = setTimeout(() => {
        checkAndStartTimer()
      }, 500)

      return () => clearTimeout(timeoutId)
    }, [case_.id, preferencesLoaded])

    // Handle timer start confirmation
    const handleTimerStartConfirm = useCallback(async () => {
      try {
        await timeService.startTimer(case_.id)
        setShowTimerStartDialog(false)
        toast({
          title: "Timer started",
          description: "Time tracking has begun for today.",
        })
        // Force a page refresh of timer state by triggering a custom event
        window.dispatchEvent(new CustomEvent("timer-started", { detail: { caseId: case_.id } }))
      } catch (error) {
        toast({
          title: "Failed to start timer",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        })
      }
    }, [case_.id])

    // Handle case close with timer check
    const handleCloseCaseWithTimerCheck = useCallback(async () => {
      try {
        // Check if timer is running
        const activeTimer = await timeService.getActiveTimer(case_.id)
        if (activeTimer) {
          // Show confirmation dialog
          setShowTimerStopDialog(true)
        } else {
          // No timer running - close immediately
          onCloseCase()
        }
      } catch (error) {
        // On error, just close the case
        onCloseCase()
      }
    }, [case_.id, onCloseCase])

    // Handle timer stop and case close
    const handleTimerStopAndClose = useCallback(async () => {
      try {
        // Stop timer and wait for it to complete
        await timeService.stopTimer(case_.id)
        setShowTimerStopDialog(false)
        // Small delay to ensure database write completes
        await new Promise((resolve) => setTimeout(resolve, 100))
        onCloseCase()
      } catch (error) {
        toast({
          title: "Failed to stop timer",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        })
        // Don't close case if timer stop failed - user might want to retry
      }
    }, [case_.id, onCloseCase])

    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <CaseHeader
          case={case_}
          fileCount={items.length}
          items={items}
          onClose={handleCloseCaseWithTimerCheck}
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
          onOpenTimeManagement={() => setShowTimeManagement(true)}
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
        ) : showTimeManagement ? (
          /* Time Management Mode */
          <div className="flex-1 overflow-hidden min-h-0">
            <TimeManagementPage case_={case_} onClose={() => setShowTimeManagement(false)} />
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

        {/* Timer Start Confirmation Dialog */}
        <AlertDialog open={showTimerStartDialog} onOpenChange={setShowTimerStartDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Timer?</AlertDialogTitle>
              <AlertDialogDescription>
                You don't have a time entry for today. Would you like to start the timer now?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowTimerStartDialog(false)}>
                Not Now
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleTimerStartConfirm}>Start Timer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Timer Stop Confirmation Dialog */}
        <AlertDialog open={showTimerStopDialog} onOpenChange={setShowTimerStopDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Timer is Running</AlertDialogTitle>
              <AlertDialogDescription>
                You have an active timer. Would you like to stop it before closing the case?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowTimerStopDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleTimerStopAndClose}>Stop & Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
