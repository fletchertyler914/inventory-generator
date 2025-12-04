import { useState, useCallback, useEffect, useMemo, memo, lazy, Suspense } from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { FileText, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import { CaseHeader } from "./CaseHeader"
import { FileNavigator } from "./FileNavigator"
import { IntegratedFileViewer } from "./IntegratedFileViewer"
import { NotePanel } from "../notes/NotePanel"
import { FindingsPanel } from "../findings/FindingsPanel"
import { TimelineView } from "../timeline/TimelineView"
import { ReportGenerator } from "../reports/ReportGenerator"

// Lazy load heavy components for better initial load performance
const LazyWorkflowBoard = lazy(() => import("../board/WorkflowBoard").then(m => ({ default: m.WorkflowBoard })))
const LazyProgressDashboard = lazy(() => import("../dashboard/ProgressDashboard").then(m => ({ default: m.ProgressDashboard })))
const LazyReportView = lazy(() => import("../reports/ReportView").then(m => ({ default: m.ReportView })))
import { workspacePreferencesService } from "@/services/workspacePreferencesService"
import { useDebounce } from "@/hooks/useDebounce"
import { getStoreValue, setStoreValue } from "@/lib/store-utils"
import { cn } from "@/lib/utils"
import type { Case } from "@/types/case"
import type { InventoryItem } from "@/types/inventory"
import { fileService } from "@/services/fileService"
import { toast } from "@/hooks/useToast"

interface CaseWorkspaceProps {
  case: Case
  items: InventoryItem[]
  onItemsChange: (items: InventoryItem[]) => void
  selectedIndices: number[]
  onSelectionChange: (indices: number[]) => void
  loading: boolean
  onCloseCase: () => void
  onAddFiles: (folderPath: string) => void
  onBulkUpdate: (updates: Partial<InventoryItem>, indices?: number[]) => void
}

/**
 * CaseWorkspace - Integrated Multi-Pane Layout
 *
 * ELITE ARCHITECTURE:
 * - Three-pane layout: File Navigator | File Viewer + Notes | Table
 * - Zero friction: Click file → view instantly
 * - Integrated notes: Always visible, auto-save
 * - Blazing fast: Database-backed, virtual scrolling
 */
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
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized to prevent unnecessary re-renders
 * - All event handlers use useCallback
 * - Expensive computations memoized with useMemo
 */
export const CaseWorkspace = memo(function CaseWorkspace({
  case: case_,
  items,
  onItemsChange,
  selectedIndices,
  onSelectionChange,
  onCloseCase,
  onAddFiles,
}: CaseWorkspaceProps) {
  const [viewingFile, setViewingFile] = useState<InventoryItem | null>(null)
  // Track last selected file before switching to timeline (for restoration)
  const [_lastSelectedFile, setLastSelectedFile] = useState<InventoryItem | null>(null)
  
  // Workspace preferences state (loaded from database)
  const [viewMode, setViewMode] = useState<"split" | "table">("table")
  const [reportMode, setReportMode] = useState<boolean>(false)
  const [navigatorOpen, setNavigatorOpen] = useState(true)
  const [notesVisible, setNotesVisible] = useState<boolean>(false)
  const [findingsVisible, setFindingsVisible] = useState<boolean>(false)
  const [timelineVisible, setTimelineVisible] = useState<boolean>(false)
  const [preferencesLoaded, setPreferencesLoaded] = useState<boolean>(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true) // Enabled by default
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState<number>(5)
  
  // Report generation dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState<boolean>(false)

  const [lastFileLoaded, setLastFileLoaded] = useState<boolean>(false)

  // Load workspace preferences from database on mount
  useEffect(() => {
    let mounted = true

    const loadPreferences = async () => {
      try {
        const [prefs, lastFilePath] = await Promise.all([
          workspacePreferencesService.getPreferences(case_.id),
          getStoreValue<string | null>(`casespace-last-file-${case_.id}`, null, "settings"),
        ])
        const defaults = workspacePreferencesService.getDefaultPreferences()
        
        if (mounted) {
          if (prefs) {
            setViewMode(prefs.view_mode)
            setReportMode(prefs.report_mode)
            setNavigatorOpen(prefs.navigator_open)
            setNotesVisible(prefs.notes_visible)
            setFindingsVisible(prefs.findings_visible)
            setTimelineVisible(prefs.timeline_visible)
            setAutoSyncEnabled(prefs.auto_sync_enabled ?? false)
            setAutoSyncIntervalMinutes(prefs.auto_sync_interval_minutes ?? 5)
          } else {
            // Use defaults if no preferences found
            setViewMode(defaults.view_mode)
            setReportMode(defaults.report_mode)
            setNavigatorOpen(defaults.navigator_open)
            setNotesVisible(defaults.notes_visible)
            setFindingsVisible(defaults.findings_visible)
            setTimelineVisible(defaults.timeline_visible)
          }
          setPreferencesLoaded(true)

          // Load last selected file if it exists
          if (lastFilePath) {
            const lastFile = items.find((item) => item.absolute_path === lastFilePath)
            if (lastFile) {
              setLastSelectedFile(lastFile)
            }
          }
          setLastFileLoaded(true)
        }
      } catch (error) {
        console.error("Failed to load workspace preferences:", error)
        if (mounted) {
          const defaults = workspacePreferencesService.getDefaultPreferences()
          setViewMode(defaults.view_mode)
          setReportMode(defaults.report_mode)
          setNavigatorOpen(defaults.navigator_open)
            setNotesVisible(defaults.notes_visible)
            setFindingsVisible(defaults.findings_visible)
            setTimelineVisible(defaults.timeline_visible)
            setAutoSyncEnabled(defaults.auto_sync_enabled ?? true)
            setAutoSyncIntervalMinutes(defaults.auto_sync_interval_minutes ?? 5)
          setPreferencesLoaded(true)
          setLastFileLoaded(true)
        }
      }
    }

    loadPreferences()

    return () => {
      mounted = false
    }
  }, [case_.id, items])

  // No status filter - swimlanes organize by status automatically
  const [statusFilter] = useState<TableFilter>("all")
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Debounce preferences for saving
  const debouncedViewMode = useDebounce(viewMode, 500)
  const debouncedReportMode = useDebounce(reportMode, 500)
  const debouncedNavigatorOpen = useDebounce(navigatorOpen, 500)
  const debouncedNotesVisible = useDebounce(notesVisible, 500)
  const debouncedFindingsVisible = useDebounce(findingsVisible, 500)
  const debouncedTimelineVisible = useDebounce(timelineVisible, 500)
  const debouncedAutoSyncEnabled = useDebounce(autoSyncEnabled, 500)
  const debouncedAutoSyncIntervalMinutes = useDebounce(autoSyncIntervalMinutes, 500)

  // Save preferences to database (debounced)
  useEffect(() => {
    if (!preferencesLoaded) return // Don't save during initial load

    const savePreferences = async () => {
      try {
        await workspacePreferencesService.savePreferences(case_.id, {
          view_mode: debouncedViewMode,
          report_mode: debouncedReportMode,
          navigator_open: debouncedNavigatorOpen,
          notes_visible: debouncedNotesVisible,
          findings_visible: debouncedFindingsVisible,
          timeline_visible: debouncedTimelineVisible,
          auto_sync_enabled: debouncedAutoSyncEnabled,
          auto_sync_interval_minutes: debouncedAutoSyncIntervalMinutes,
        })
      } catch (error) {
        console.error("Failed to save workspace preferences:", error)
      }
    }

    savePreferences()
  }, [
    case_.id,
    debouncedViewMode,
    debouncedReportMode,
    debouncedNavigatorOpen,
    debouncedNotesVisible,
    debouncedFindingsVisible,
    debouncedTimelineVisible,
    debouncedAutoSyncEnabled,
    debouncedAutoSyncIntervalMinutes,
    preferencesLoaded,
  ])

  // Keyboard shortcuts for pane toggles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (isInput) return

      const modifier = navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + N: Toggle notes
      if (modifier && e.key.toLowerCase() === "n") {
        e.preventDefault()
        setNotesVisible((prev: boolean) => !prev)
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])


  // Build folder tree structure (same as FileNavigator) and flatten in display order
  // This ensures navigation buttons follow the same order as the file tree
  const flattenedFileList = useMemo(() => {
    interface FolderNode {
      name: string
      path: string
      files: InventoryItem[]
      subfolders: Map<string, FolderNode>
    }

    // Build folder tree structure (same logic as FileNavigator)
    const root: FolderNode = {
      name: '',
      path: '',
      files: [],
      subfolders: new Map(),
    }

    items.forEach(item => {
      // Handle empty or root folder paths
      const folderPath = item.folder_path || ''
      
      // Parse folder path into segments
      const pathParts = folderPath.split('/').filter(p => p.trim())
      
      // If no folder path, add file to root
      if (pathParts.length === 0) {
        root.files.push(item)
        return
      }

      let current = root

      // Navigate/create folder structure
      pathParts.forEach((part, index) => {
        if (!current.subfolders.has(part)) {
          const fullPath = pathParts.slice(0, index + 1).join('/')
          current.subfolders.set(part, {
            name: part,
            path: fullPath,
            files: [],
            subfolders: new Map(),
          })
        }
        current = current.subfolders.get(part)!
      })

      // Add file to current folder
      current.files.push(item)
    })

    // Flatten tree in display order (same as FileNavigator renders)
    // Folders first (sorted), then files within each folder (sorted)
    const flattened: InventoryItem[] = []
    
    const flattenNode = (node: FolderNode) => {
      // Sort and process subfolders first (alphabetically)
      const sortedSubfolders = Array.from(node.subfolders.values())
        .sort((a, b) => a.name.localeCompare(b.name))
      
      sortedSubfolders.forEach(subfolder => {
        flattenNode(subfolder)
      })

      // Then add files in this folder (sorted alphabetically)
      const sortedFiles = node.files
        .sort((a, b) => a.file_name.localeCompare(b.file_name))
      
      flattened.push(...sortedFiles)
    }

    flattenNode(root)
    return flattened
  }, [items])

  // Filter items based on folder and search (status filtering handled by swimlanes)
  const filteredItems = useMemo(() => {
    let filtered = [...items]

    // No status filter - swimlanes organize by status automatically

    // Apply folder filter (when folder selected in navigator)
    if (selectedFolderPath) {
      filtered = filtered.filter((item) => item.folder_path === selectedFolderPath)
    }

    // Helper to get field from inventory_data
    const getInventoryField = (item: InventoryItem, field: string): string => {
      if (!item.inventory_data) return ""
      try {
        const data = JSON.parse(item.inventory_data)
        return data[field] || ""
      } catch {
        return ""
      }
    }

    // Apply search filter (when search active)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.file_name.toLowerCase().includes(query) ||
          getInventoryField(item, "document_description").toLowerCase().includes(query) ||
          getInventoryField(item, "document_type").toLowerCase().includes(query) ||
          item.folder_path.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [items, statusFilter, selectedFolderPath, searchQuery])


  const handleFileSelect = useCallback(
    async (file: InventoryItem) => {
      setViewingFile(file)
      setLastSelectedFile(file) // Track last selected file
      // Persist last selected file to store
      if (lastFileLoaded) {
        try {
          await setStoreValue(`casespace-last-file-${case_.id}`, file.absolute_path, "settings")
        } catch (error) {
          console.error("Failed to save last selected file:", error)
        }
      }
      // Automatically switch to review mode when a file is selected
      setViewMode("split")
      // Show notes panel when file is selected (if not already visible)
      if (!notesVisible && file) {
        setNotesVisible(true)
      }
      // Timeline can stay open alongside file view
    },
    [notesVisible, timelineVisible, case_.id, lastFileLoaded]
  )

  // Reset to board view when file is closed
  const handleFileClose = useCallback(() => {
    setViewingFile(null)
    setViewMode("table")
    setNotesVisible(false)
  }, [])

  const handleFileOpen = useCallback(
    (filePath: string) => {
      const file = items.find((item) => item.absolute_path === filePath)
      if (file) {
        handleFileSelect(file)
      }
    },
    [items, handleFileSelect]
  )

  const handleAddFilesClick = useCallback(async () => {
    const { open } = await import("@tauri-apps/plugin-dialog")
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select folder to add files",
      })
      if (selected && typeof selected === "string") {
        onAddFiles(selected)
      }
    } catch (error) {
      console.error("Failed to select folder:", error)
    }
  }, [onAddFiles])

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

        // Remove file from items array
        const updatedItems = items.filter((item) => item.id !== file.id)
        onItemsChange(updatedItems)

        // If deleted file is currently viewed, close viewer
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

  // Memoized toggle handlers
  const handleToggleReportMode = useCallback(() => {
    setReportMode((prev) => !prev)
  }, [])

  const handleToggleNotes = useCallback(() => {
    setNotesVisible((prev: boolean) => !prev)
  }, [])

  const handleToggleFindings = useCallback(() => {
    setFindingsVisible((prev: boolean) => !prev)
  }, [])

  const handleToggleTimeline = useCallback(() => {
    setTimelineVisible((prev) => !prev)
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleNoteSelect = useCallback((noteId: string) => {
    // Open notes panel, switch to split view, and navigate to the note
    setSelectedNoteId(noteId)
    if (!notesVisible) {
      setNotesVisible(true)
    }
    if (viewMode !== "split") {
      setViewMode("split")
    }
  }, [notesVisible, viewMode])

  const handleFindingSelect = useCallback(() => {
    setFindingsVisible(true)
    setViewMode("split")
  }, [])

  const handleTimelineSelect = useCallback(() => {
    // Open timeline panel and switch to review mode if not already
    if (!timelineVisible) {
      setTimelineVisible(true)
    }
    if (viewMode !== "split" && viewingFile) {
      setViewMode("split")
    } else if (viewMode !== "split" && !viewingFile) {
      // If no file is selected, just show the timeline panel
      setTimelineVisible(true)
    }
  }, [timelineVisible, viewMode, viewingFile])

  const handleGenerateReport = useCallback(() => {
    setReportDialogOpen(true)
  }, [])

  // Memoized navigation handlers
  const handleNextFile = useCallback(() => {
    const currentIndex = flattenedFileList.findIndex(
      (f) => f.absolute_path === viewingFile?.absolute_path
    )
    const nextFile =
      currentIndex >= 0 && currentIndex < flattenedFileList.length - 1
        ? flattenedFileList[currentIndex + 1]
        : undefined
    if (nextFile) {
      handleFileSelect(nextFile)
    }
  }, [flattenedFileList, viewingFile?.absolute_path, handleFileSelect])

  const handlePreviousFile = useCallback(() => {
    const currentIndex = flattenedFileList.findIndex(
      (f) => f.absolute_path === viewingFile?.absolute_path
    )
    const prevFile = currentIndex > 0 ? flattenedFileList[currentIndex - 1] : undefined
    if (prevFile) {
      handleFileSelect(prevFile)
    }
  }, [flattenedFileList, viewingFile?.absolute_path, handleFileSelect])

  const handleFileRefresh = useCallback(async () => {
    // Reload case files after refresh (force cache clear)
    try {
      const { fileService } = await import("@/services/fileService")
      const refreshedItems = await fileService.loadCaseFilesWithInventory(case_.id, true)
      onItemsChange(refreshedItems)
    } catch (error) {
      console.error("Failed to reload files after refresh:", error)
    }
  }, [case_.id, onItemsChange])

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<number | null>(null)

  /**
   * Auto-sync logic - Only runs for the currently active/open case
   * 
   * ELITE PERFORMANCE & SCALABILITY:
   * - Auto-sync only runs when this component is mounted (case is open)
   * - When case is closed, component unmounts and cleanup stops all timers
   * - This ensures we never sync multiple cases simultaneously
   * - Resource-efficient: only one case syncs at a time
   * - Pauses when app/tab is hidden (document.hidden check)
   */
  useEffect(() => {
    if (!autoSyncEnabled || !preferencesLoaded) return

    const syncInterval = autoSyncIntervalMinutes * 60 * 1000 // Convert to milliseconds
    let lastSyncTime = lastAutoSyncTime

    const performAutoSync = async () => {
      // Check if document is visible (pauses when app is inactive)
      if (document.hidden) {
        return
      }

      // Don't sync if manual sync just happened (within last minute)
      const now = Date.now()
      if (lastSyncTime && now - lastSyncTime < 60000) {
        return
      }

      // Don't sync if manual sync is in progress
      if (isSyncing) {
        return
      }

      try {
        setIsSyncing(true)
        const { fileService } = await import("@/services/fileService")
        const result = await fileService.syncCaseAllSources(case_.id, true) // Incremental only

        // Reload files after sync
        const refreshedItems = await fileService.loadCaseFilesWithInventory(case_.id, true)
        onItemsChange(refreshedItems)

        lastSyncTime = now
        setLastAutoSyncTime(now)

        // Show subtle notification only if files were actually changed
        if (result.files_inserted > 0 || result.files_updated > 0) {
          toast({
            title: "Files synced",
            description: `${result.files_inserted} new, ${result.files_updated} updated`,
            variant: "default",
            duration: 3000, // Shorter duration for auto-sync
          })
        }

        if (result.errors && result.errors.length > 0) {
          toast({
            title: "Sync completed with errors",
            description: result.errors.slice(0, 2).join(", "),
            variant: "destructive",
            duration: 4000,
          })
        }
      } catch (error) {
        // Silent failure for auto-sync (don't spam user with errors)
        console.error("Auto-sync failed:", error)
      } finally {
        setIsSyncing(false)
      }
    }

    // Initial sync after interval (don't sync immediately on mount)
    const initialTimeout = setTimeout(() => {
      performAutoSync()
    }, syncInterval)

    // Set up periodic sync
    const interval = setInterval(performAutoSync, syncInterval)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    case_.id,
    onItemsChange,
    preferencesLoaded,
    isSyncing,
  ])

  const handleSyncFiles = useCallback(async () => {
    setIsSyncing(true)
    try {
      const { fileService } = await import("@/services/fileService")
      const result = await fileService.syncCaseAllSources(case_.id, true)
      
      // Reload files after sync (cache is already cleared by syncCaseAllSources)
      const refreshedItems = await fileService.loadCaseFilesWithInventory(case_.id, true)
      onItemsChange(refreshedItems)

      // Update last sync time to prevent immediate auto-sync
      setLastAutoSyncTime(Date.now())

      toast({
        title: "Files synced",
        description: `${result.files_inserted} new, ${result.files_updated} updated, ${result.files_skipped} skipped`,
        variant: "success",
      })

      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Sync completed with errors",
          description: result.errors.slice(0, 3).join(", "),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Failed to sync files",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }, [case_.id, onItemsChange])

  const handleToggleNavigator = useCallback(() => {
    setNavigatorOpen((prev: boolean) => !prev)
  }, [])

  const handleExpandNavigator = useCallback(() => {
    setNavigatorOpen(true)
  }, [])

  const handleCloseNotes = useCallback(() => {
    setNotesVisible(false)
  }, [])

  const handleCloseFindings = useCallback(() => {
    setFindingsVisible(false)
  }, [])

  const handleToggleAutoSync = useCallback(() => {
    setAutoSyncEnabled((prev) => !prev)
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <CaseHeader
        case={case_}
        fileCount={items.length}
        items={items}
        onClose={onCloseCase}
        onAddFiles={handleAddFilesClick}
        viewMode={viewMode}
        viewingFile={viewingFile}
        reportMode={reportMode}
        onToggleReportMode={handleToggleReportMode}
        notesVisible={notesVisible}
        onToggleNotes={handleToggleNotes}
        findingsVisible={findingsVisible}
        onToggleFindings={handleToggleFindings}
        timelineVisible={timelineVisible}
        onToggleTimeline={handleToggleTimeline}
        onFileOpen={handleFileOpen}
        onSearchChange={handleSearchChange}
        onNoteSelect={handleNoteSelect}
        onFindingSelect={handleFindingSelect}
        onTimelineSelect={handleTimelineSelect}
        onGenerateReport={handleGenerateReport}
        onSyncFiles={handleSyncFiles}
        isSyncing={isSyncing}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
      />

      {/* Main Content Area */}
      {reportMode ? (
        /* Report Mode - Full screen ReportView (no file navigator) */
        <div className="flex-1 overflow-hidden min-h-0">
          <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            <LazyReportView
              case_={case_}
              items={items}
              onToggleReportMode={handleToggleReportMode}
            />
          </Suspense>
        </div>
      ) : (
        /* Review Mode - Show existing split/table views */
        <PanelGroup direction="horizontal" className="flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar - File Navigator (resizable) */}
          {navigatorOpen && (
          <>
            <Panel
              defaultSize={20}
              minSize={15}
              maxSize={40}
              className="flex flex-col overflow-hidden"
            >
              <div className="h-full bg-card flex flex-col">
                <FileNavigator
                  items={items}
                  currentFile={viewingFile}
                  onFileSelect={handleFileSelect}
                  selectedFolderPath={selectedFolderPath}
                  onFolderSelect={setSelectedFolderPath}
                  navigatorOpen={navigatorOpen}
                  onToggleNavigator={handleToggleNavigator}
                  onFileRemove={handleFileRemove}
                  caseId={case_.id}
                />
              </div>
            </Panel>
            <PanelResizeHandle className="group w-1.5 bg-transparent hover:bg-border/30 transition-colors duration-200 cursor-col-resize relative flex items-center justify-center">
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/60 transition-colors" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
              </div>
            </PanelResizeHandle>
          </>
        )}

        {/* Toggle Button - When Sidebar is Collapsed */}
        {!navigatorOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExpandNavigator}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-r border-l-0 border border-border/40 dark:border-border/50 bg-background hover:bg-muted transition-colors duration-150"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Center/Right - Review Mode or Board View */}
        <Panel className="flex flex-col overflow-hidden min-h-0 relative">
          {viewMode === "split" ? (
            <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
              {/* File Viewer - Takes remaining space */}
              <Panel
                defaultSize={
                  notesVisible && findingsVisible && timelineVisible
                    ? 40
                    : (notesVisible && findingsVisible) ||
                        (notesVisible && timelineVisible) ||
                        (findingsVisible && timelineVisible)
                      ? 50
                      : notesVisible || findingsVisible || timelineVisible
                        ? 60
                        : 100
                }
                minSize={30}
              >
                <div className="h-full flex flex-col overflow-hidden">
                  {viewingFile ? (
                    <IntegratedFileViewer
                      file={viewingFile}
                      onClose={handleFileClose}
                      onNext={handleNextFile}
                      onPrevious={handlePreviousFile}
                      hasNext={
                        flattenedFileList.findIndex((f) => f.absolute_path === viewingFile.absolute_path) <
                        flattenedFileList.length - 1
                      }
                      hasPrevious={
                        flattenedFileList.findIndex((f) => f.absolute_path === viewingFile.absolute_path) > 0
                      }
                      caseId={case_.id}
                      onFileRefresh={handleFileRefresh}
                      onFileRemove={handleFileRemove}
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
                          Click a file from the navigator or table to view it
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Notes Panel - Resizable right side */}
              {notesVisible && (
                <>
                  <PanelResizeHandle className="group w-1.5 bg-transparent hover:bg-border/30 transition-colors duration-200 cursor-col-resize relative flex items-center justify-center">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/60 transition-colors" />
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                    </div>
                  </PanelResizeHandle>
                  <Panel
                    defaultSize={
                      notesVisible && findingsVisible && timelineVisible
                        ? 15
                        : (notesVisible && findingsVisible) ||
                            (notesVisible && timelineVisible) ||
                            (findingsVisible && timelineVisible)
                          ? 20
                          : notesVisible || findingsVisible || timelineVisible
                            ? 25
                            : 35
                    }
                    minSize={20}
                    maxSize={40}
                  >
                    <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
                      <NotePanel
                        caseId={case_.id}
                        fileId={viewingFile?.id}
                        onClose={handleCloseNotes}
                        initialNoteId={selectedNoteId}
                      />
                    </div>
                  </Panel>
                </>
              )}

              {/* Findings Panel - Resizable right side */}
              {findingsVisible && (
                <>
                  <PanelResizeHandle className="group w-1.5 bg-transparent hover:bg-border/30 transition-colors duration-200 cursor-col-resize relative flex items-center justify-center">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/60 transition-colors" />
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                    </div>
                  </PanelResizeHandle>
                  <Panel
                    defaultSize={
                      notesVisible && findingsVisible && timelineVisible
                        ? 18
                        : (notesVisible && findingsVisible) ||
                            (notesVisible && timelineVisible) ||
                            (findingsVisible && timelineVisible)
                          ? 22
                          : notesVisible || findingsVisible || timelineVisible
                            ? 25
                            : 35
                    }
                    minSize={20}
                    maxSize={40}
                  >
                    <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
                      <FindingsPanel caseId={case_.id} onClose={handleCloseFindings} />
                    </div>
                  </Panel>
                </>
              )}

              {/* Timeline Panel - Resizable right side */}
              {timelineVisible && (
                <>
                  <PanelResizeHandle className="group w-1.5 bg-transparent hover:bg-border/30 transition-colors duration-200 cursor-col-resize relative flex items-center justify-center">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/60 transition-colors" />
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                      <div className="w-0.5 h-3 bg-primary/70 rounded-full" />
                    </div>
                  </PanelResizeHandle>
                  <Panel
                    defaultSize={
                      notesVisible && findingsVisible
                        ? 30
                        : notesVisible || findingsVisible
                          ? 35
                          : 40
                    }
                    minSize={20}
                    maxSize={50}
                  >
                    <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
                      <TimelineView caseId={case_.id} {...(viewingFile?.id !== undefined && { currentFileId: viewingFile.id })} />
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          ) : (
            /* Board-only view - Full width for optimal board experience */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-4 pt-4 pb-3 border-b border-border/40 dark:border-border/50 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold mb-1">Workflow Board</h2>
                    <p className="text-xs text-muted-foreground">
                      Organize and track files through review stages
                    </p>
                  </div>
                </div>
                {items.length > 0 && (
                  <Suspense fallback={<div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}>
                    <LazyProgressDashboard items={items} />
                  </Suspense>
                )}
              </div>
              <div className={cn("flex-1 overflow-hidden min-h-0 min-w-0", !navigatorOpen && "pl-8")}>
                <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                  <LazyWorkflowBoard
                    items={filteredItems}
                    onItemsChange={onItemsChange}
                    selectedIndices={selectedIndices}
                    onSelectionChange={onSelectionChange}
                    onFileOpen={handleFileOpen}
                    onFileRemove={handleFileRemove}
                    statusFilter="all"
                    totalFiles={items.length}
                    caseId={case_.id}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </Panel>
        </PanelGroup>
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
}, (prevProps, nextProps) => {
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
})
