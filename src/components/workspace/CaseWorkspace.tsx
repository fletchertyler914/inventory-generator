import { useState, useCallback, useEffect, useMemo } from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { FileText, ChevronRight } from "lucide-react"
import { Button } from "../ui/button"
import { CaseHeader } from "./CaseHeader"
import { FileNavigator } from "./FileNavigator"
import { IntegratedFileViewer } from "./IntegratedFileViewer"
import { NotePanel } from "../notes/NotePanel"
import { FindingsPanel } from "../findings/FindingsPanel"
import { TimelineView } from "../timeline/TimelineView"
import { WorkflowBoard } from "../board/WorkflowBoard"
import { ProgressDashboard } from "../dashboard/ProgressDashboard"
import { ReportGenerator } from "../reports/ReportGenerator"
import { ReportView } from "../reports/ReportView"
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

export function CaseWorkspace({
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

  // Get context description for UI
  const contextDescription = useMemo(() => {
    const parts: string[] = []

    if (selectedFolderPath) {
      const folderName = selectedFolderPath.split("/").pop() || selectedFolderPath
      parts.push(`Folder: ${folderName}`)
    }

    if (searchQuery.trim()) {
      parts.push(`Search: "${searchQuery}"`)
    }

    return parts.length > 0 ? parts.join(" • ") : "All workflow states"
  }, [selectedFolderPath, searchQuery])

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
        onToggleReportMode={() => setReportMode((prev) => !prev)}
        notesVisible={notesVisible}
        onToggleNotes={() => setNotesVisible((prev: boolean) => !prev)}
        findingsVisible={findingsVisible}
        onToggleFindings={() => setFindingsVisible((prev: boolean) => !prev)}
        timelineVisible={timelineVisible}
        onToggleTimeline={() => {
          setTimelineVisible((prev) => !prev)
        }}
        onFileOpen={handleFileOpen}
        onSearchChange={setSearchQuery}
        onFindingSelect={() => {
          setFindingsVisible(true)
          setViewMode("split")
        }}
        onTimelineSelect={() => {
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
        }}
        onGenerateReport={() => setReportDialogOpen(true)}
      />

      {/* Main Content Area */}
      {reportMode ? (
        /* Report Mode - Show ReportView */
        <PanelGroup direction="horizontal" className="flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar - File Navigator (resizable, stays visible) */}
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
                    onToggleNavigator={() => setNavigatorOpen((prev: boolean) => !prev)}
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
              onClick={() => setNavigatorOpen(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-r border-l-0 border border-border bg-background hover:bg-muted transition-colors duration-150"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* Report View */}
          <Panel className="flex flex-col overflow-hidden min-h-0 relative">
            <ReportView
              case_={case_}
              items={items}
              onToggleReportMode={() => setReportMode(false)}
            />
          </Panel>
        </PanelGroup>
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
                  onToggleNavigator={() => setNavigatorOpen((prev: boolean) => !prev)}
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
            onClick={() => setNavigatorOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-r border-l-0 border border-border bg-background hover:bg-muted transition-colors duration-150"
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
                      onNext={() => {
                        const currentIndex = items.findIndex(
                          (f) => f.absolute_path === viewingFile.absolute_path
                        )
                        const nextFile =
                          currentIndex >= 0 && currentIndex < items.length - 1
                            ? items[currentIndex + 1]
                            : undefined
                        if (nextFile) {
                          handleFileSelect(nextFile)
                        }
                      }}
                      onPrevious={() => {
                        const currentIndex = items.findIndex(
                          (f) => f.absolute_path === viewingFile.absolute_path
                        )
                        const prevFile = currentIndex > 0 ? items[currentIndex - 1] : undefined
                        if (prevFile) {
                          handleFileSelect(prevFile)
                        }
                      }}
                      hasNext={
                        items.findIndex((f) => f.absolute_path === viewingFile.absolute_path) <
                        items.length - 1
                      }
                      hasPrevious={
                        items.findIndex((f) => f.absolute_path === viewingFile.absolute_path) > 0
                      }
                      caseId={case_.id}
                      onFileRefresh={async () => {
                        // Reload case files after refresh
                        try {
                          const { fileService } = await import("@/services/fileService")
                          const refreshedItems = await fileService.loadCaseFilesWithInventory(
                            case_.id
                          )
                          onItemsChange(refreshedItems)
                        } catch (error) {
                          console.error("Failed to reload files after refresh:", error)
                        }
                      }}
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
                        onClose={() => setNotesVisible(false)}
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
                      <FindingsPanel caseId={case_.id} onClose={() => setFindingsVisible(false)} />
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
                      <div className="p-3 border-b border-border flex-shrink-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                        <h3 className="text-sm font-semibold">Timeline</h3>
                      </div>
                      <div className="flex-1 overflow-hidden min-h-0">
                        <TimelineView caseId={case_.id} currentFileId={viewingFile?.id} />
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          ) : (
            /* Board-only view - Full width for optimal board experience */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold mb-1">Workflow Board</h2>
                    <p className="text-xs text-muted-foreground">
                      Organize and track files through review stages
                    </p>
                  </div>
                </div>
                {items.length > 0 && <ProgressDashboard items={items} />}
              </div>
              <div className={cn("flex-1 overflow-hidden min-h-0 min-w-0", !navigatorOpen && "pl-8")}>
                <WorkflowBoard
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
}
