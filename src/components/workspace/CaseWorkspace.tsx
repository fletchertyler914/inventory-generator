import { useState, useCallback, useEffect, useMemo } from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { FileText } from "lucide-react"
import { CaseHeader } from "./CaseHeader"
import { FileNavigator } from "./FileNavigator"
import { IntegratedFileViewer } from "./IntegratedFileViewer"
import { NotePanel } from "../notes/NotePanel"
import { FindingsPanel } from "../findings/FindingsPanel"
import { TimelineView } from "../timeline/TimelineView"
import { InventoryTable } from "../InventoryTable"
import { ProgressDashboard } from "../dashboard/ProgressDashboard"
import { getColumnConfig, type TableColumnConfig } from "@/types/tableColumns"
import { getStoreValue, setStoreValue } from "@/lib/store-utils"
import type { Case } from "@/types/case"
import type { InventoryItem } from "@/types/inventory"

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
  const [lastSelectedFile, setLastSelectedFile] = useState<InventoryItem | null>(null)
  // Default to table view for better initial experience - switch to split when file is selected
  const [viewMode, setViewMode] = useState<"split" | "table" | "timeline">("table")
  const [navigatorOpen, setNavigatorOpen] = useState(true)
  const [lastFileLoaded, setLastFileLoaded] = useState<boolean>(false)
  const [columnConfig, setColumnConfig] = useState<TableColumnConfig>(() =>
    getColumnConfig(case_.id)
  )

  // Pane visibility state (stored in Tauri store per case)
  const [tableVisible, setTableVisible] = useState<boolean>(true)
  const [notesVisible, setNotesVisible] = useState<boolean>(false)
  const [findingsVisible, setFindingsVisible] = useState<boolean>(false)
  const [timelineVisible, setTimelineVisible] = useState<boolean>(false)
  const [panesLoaded, setPanesLoaded] = useState<boolean>(false)

  // Load pane visibility and last selected file from Tauri store on mount
  useEffect(() => {
    let mounted = true

    const loadPanesAndLastFile = async () => {
      try {
        const [table, notes, findings, timeline, lastFilePath] = await Promise.all([
          getStoreValue<boolean>(`casespace-pane-table-${case_.id}`, true, "settings"),
          getStoreValue<boolean>(`casespace-pane-notes-${case_.id}`, false, "settings"),
          getStoreValue<boolean>(`casespace-pane-findings-${case_.id}`, false, "settings"),
          getStoreValue<boolean>(`casespace-pane-timeline-${case_.id}`, false, "settings"),
          getStoreValue<string | null>(`casespace-last-file-${case_.id}`, null, "settings"),
        ])

        if (mounted) {
          setTableVisible(table)
          setNotesVisible(notes)
          setFindingsVisible(findings)
          setTimelineVisible(timeline)
          setPanesLoaded(true)

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
        console.error("Failed to load pane visibility from store:", error)
        if (mounted) {
          setPanesLoaded(true)
          setLastFileLoaded(true)
        }
      }
    }

    loadPanesAndLastFile()

    return () => {
      mounted = false
    }
  }, [case_.id, items])

  // ELITE UX: Contextual filtering - default to unreviewed (what needs work)
  const [statusFilter, setStatusFilter] = useState<TableFilter>("unreviewed")
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Save pane visibility to Tauri store
  useEffect(() => {
    if (!panesLoaded) return // Don't save during initial load
    setStoreValue(`casespace-pane-table-${case_.id}`, tableVisible, "settings").catch(
      console.error
    )
  }, [tableVisible, case_.id, panesLoaded])

  useEffect(() => {
    if (!panesLoaded) return // Don't save during initial load
    setStoreValue(`casespace-pane-notes-${case_.id}`, notesVisible, "settings").catch(
      console.error
    )
  }, [notesVisible, case_.id, panesLoaded])

  useEffect(() => {
    if (!panesLoaded) return // Don't save during initial load
    setStoreValue(`casespace-pane-findings-${case_.id}`, findingsVisible, "settings").catch(
      console.error
    )
  }, [findingsVisible, case_.id, panesLoaded])

  useEffect(() => {
    if (!panesLoaded) return // Don't save during initial load
    setStoreValue(`casespace-pane-timeline-${case_.id}`, timelineVisible, "settings").catch(
      console.error
    )
  }, [timelineVisible, case_.id, panesLoaded])

  // Keyboard shortcuts for pane toggles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (isInput) return

      const modifier = navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + B: Toggle table
      if (modifier && e.key.toLowerCase() === "b") {
        e.preventDefault()
        setTableVisible((prev: boolean) => !prev)
        return
      }

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

  // Reload column config when case changes
  useEffect(() => {
    setColumnConfig(getColumnConfig(case_.id))
  }, [case_.id])

  // ELITE UX: Filter items based on context (status, folder, search)
  const filteredItems = useMemo(() => {
    let filtered = [...items]

    // Apply status filter (default: unreviewed)
    // "unreviewed" includes files with null/undefined status (catch-all for unprocessed files)
    if (statusFilter !== "all") {
      if (statusFilter === "unreviewed") {
        // Include files with null/undefined status OR explicitly marked as unreviewed
        filtered = filtered.filter((item) => !item.status || item.status === "unreviewed")
      } else {
        // For other statuses, only show files explicitly marked with that status
        filtered = filtered.filter((item) => item.status === statusFilter)
      }
    }

    // Apply folder filter (when folder selected in navigator)
    if (selectedFolderPath) {
      filtered = filtered.filter((item) => item.folder_path === selectedFolderPath)
    }

    // Helper to get field from inventory_data
    const getInventoryField = (item: InventoryItem, field: string): string => {
      if (!item.inventory_data) return '';
      try {
        const data = JSON.parse(item.inventory_data);
        return data[field] || '';
      } catch {
        return '';
      }
    };

    // Apply search filter (when search active)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.file_name.toLowerCase().includes(query) ||
          getInventoryField(item, 'document_description').toLowerCase().includes(query) ||
          getInventoryField(item, 'document_type').toLowerCase().includes(query) ||
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

    if (statusFilter !== "all") {
      const statusLabels: Record<TableFilter, string> = {
        unreviewed: "Unreviewed",
        in_progress: "In Progress",
        reviewed: "Reviewed",
        flagged: "Flagged",
        finalized: "Finalized",
        all: "All",
      }
      parts.push(statusLabels[statusFilter])
    }

    if (searchQuery.trim()) {
      parts.push(`Search: "${searchQuery}"`)
    }

    return parts.length > 0 ? parts.join(" • ") : "All Files"
  }, [selectedFolderPath, statusFilter, searchQuery])

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
      // Automatically switch to split view when a file is selected
      setViewMode("split")
      // Hide table panel by default when file is selected
      setTableVisible(false)
      // Show notes panel when file is selected (if not already visible)
      if (!notesVisible && file) {
        setNotesVisible(true)
      }
      // Close timeline if open (file view takes priority)
      if (timelineVisible) {
        setTimelineVisible(false)
      }
    },
    [notesVisible, timelineVisible, case_.id, lastFileLoaded]
  )

  // Reset to table view when file is closed
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
        onViewModeChange={async (mode) => {
          if (mode === "split" && lastSelectedFile && !viewingFile) {
            // Restore last selected file when switching back to split view from timeline
            // Verify the file still exists in the items list
            const fileStillExists = items.some(
              (item) => item.absolute_path === lastSelectedFile.absolute_path
            )
            if (fileStillExists) {
              setViewingFile(lastSelectedFile)
              setTableVisible(false)
              if (!notesVisible) {
                setNotesVisible(true)
              }
            } else {
              // File no longer exists, clear it and just switch to table view
              setLastSelectedFile(null)
              if (lastFileLoaded) {
                try {
                  await setStoreValue(`casespace-last-file-${case_.id}`, null, "settings")
                } catch (error) {
                  console.error("Failed to clear last selected file:", error)
                }
              }
              setViewMode("table")
              return
            }
          } else if (mode === "table") {
            // Clear viewing file when switching to table view
            setViewingFile(null)
          }
          setViewMode(mode)
          // Close timeline when switching away from timeline view
          if (mode !== "timeline" && timelineVisible) {
            setTimelineVisible(false)
          }
        }}
        viewingFile={viewingFile}
        lastSelectedFile={lastSelectedFile}
        tableVisible={tableVisible}
        onToggleTable={() => setTableVisible((prev: boolean) => !prev)}
        notesVisible={notesVisible}
        onToggleNotes={() => setNotesVisible((prev: boolean) => !prev)}
        findingsVisible={findingsVisible}
        onToggleFindings={() => setFindingsVisible((prev: boolean) => !prev)}
        timelineVisible={timelineVisible}
        onToggleTimeline={async () => {
          if (timelineVisible) {
            // Closing timeline - return to table view
            setTimelineVisible(false)
            setViewMode("table")
          } else {
            // Opening timeline - switch to timeline view mode
            // Save current file before switching to timeline (for restoration)
            if (viewingFile) {
              setLastSelectedFile(viewingFile)
              // Persist last selected file to store
              if (lastFileLoaded) {
                try {
                  await setStoreValue(`casespace-last-file-${case_.id}`, viewingFile.absolute_path, "settings")
                } catch (error) {
                  console.error("Failed to save last selected file:", error)
                }
              }
            }
            setTimelineVisible(true)
            setViewMode("timeline")
            setViewingFile(null)
            setNotesVisible(false)
          }
        }}
        onFileOpen={handleFileOpen}
        onSearchChange={setSearchQuery}
        onFindingSelect={() => {
          setFindingsVisible(true)
          setViewMode("split")
        }}
        onTimelineSelect={async () => {
          // Timeline should be a full-screen experience
          // Save current file before switching to timeline (for restoration)
          if (viewingFile) {
            setLastSelectedFile(viewingFile)
            // Persist last selected file to store
            if (lastFileLoaded) {
              try {
                await setStoreValue(`casespace-last-file-${case_.id}`, viewingFile.absolute_path, "settings")
              } catch (error) {
                console.error("Failed to save last selected file:", error)
              }
            }
          }
          setTimelineVisible(true)
          setViewMode("timeline")
          // Close file viewer and notes when opening timeline
          setViewingFile(null)
          setNotesVisible(false)
        }}
      />

      {/* Main Content Area */}
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

        {/* Center/Right - Split View or Table View */}
        <Panel className="flex flex-col overflow-hidden min-h-0">
          {viewMode === "split" ? (
            <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
              {/* File Viewer - Takes remaining space */}
              <Panel
                defaultSize={
                  tableVisible && notesVisible && findingsVisible && timelineVisible
                    ? 35
                    : tableVisible &&
                        (notesVisible || findingsVisible || timelineVisible) &&
                        ((notesVisible && findingsVisible) ||
                          (notesVisible && timelineVisible) ||
                          (findingsVisible && timelineVisible))
                      ? 40
                      : tableVisible && (notesVisible || findingsVisible || timelineVisible)
                        ? 50
                        : tableVisible
                          ? 60
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
                          const { fileService } = await import('@/services/fileService');
                          const refreshedItems = await fileService.loadCaseFilesWithInventory(case_.id);
                          onItemsChange(refreshedItems);
                        } catch (error) {
                          console.error('Failed to reload files after refresh:', error);
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
                          Click a file from the navigator or table to view it
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Table Panel - Resizable */}
              {tableVisible && (
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
                        ? 25
                        : notesVisible
                          ? 30
                          : findingsVisible
                            ? 30
                            : 40
                    }
                    minSize={20}
                    maxSize={60}
                  >
                    <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
                      <div className="p-3 border-b border-border flex-shrink-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                        <h3 className="text-sm font-semibold">Inventory Table</h3>
                      </div>
                      <div className="flex-1 overflow-hidden min-h-0">
                        <InventoryTable
                          items={filteredItems}
                          onItemsChange={onItemsChange}
                          selectedIndices={selectedIndices}
                          onSelectionChange={onSelectionChange}
                          onFileOpen={handleFileOpen}
                          statusFilter={statusFilter}
                          onStatusFilterChange={setStatusFilter}
                          totalFiles={items.length}
                          caseId={case_.id}
                        />
                      </div>
                    </div>
                  </Panel>
                </>
              )}

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
                      tableVisible && notesVisible && findingsVisible
                        ? 12
                        : tableVisible && findingsVisible
                          ? 15
                          : notesVisible && findingsVisible
                            ? 15
                            : tableVisible
                              ? 20
                              : notesVisible
                                ? 20
                                : 30
                    }
                    minSize={15}
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
                      tableVisible && notesVisible && timelineVisible
                        ? 10
                        : (tableVisible && notesVisible) ||
                            (tableVisible && timelineVisible) ||
                            (notesVisible && timelineVisible)
                          ? 12
                          : tableVisible || notesVisible || timelineVisible
                            ? 15
                            : 20
                    }
                    minSize={15}
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
                      tableVisible && notesVisible && findingsVisible
                        ? 10
                        : (tableVisible && notesVisible) ||
                            (tableVisible && findingsVisible) ||
                            (notesVisible && findingsVisible)
                          ? 12
                          : tableVisible || notesVisible || findingsVisible
                            ? 15
                            : 20
                    }
                    minSize={15}
                    maxSize={40}
                  >
                    <div className="h-full flex flex-col overflow-hidden bg-card animate-in slide-in-from-right-2 duration-300">
                      <TimelineView caseId={case_.id} />
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          ) : viewMode === "timeline" ? (
            /* Timeline-only view - Full screen timeline experience */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <TimelineView caseId={case_.id} />
            </div>
          ) : (
            /* Table-only view - Full width for optimal table experience */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold mb-1">Inventory Table</h2>
                    <p className="text-xs text-muted-foreground truncate">
                      Showing: {contextDescription} ({filteredItems.length} of {items.length} files)
                    </p>
                  </div>
                </div>
                {items.length > 0 && <ProgressDashboard items={items} />}
              </div>
              <div className="flex-1 overflow-hidden min-h-0 min-w-0">
                <InventoryTable
                  items={filteredItems}
                  onItemsChange={onItemsChange}
                  selectedIndices={selectedIndices}
                  onSelectionChange={onSelectionChange}
                  onFileOpen={handleFileOpen}
                  columnConfig={columnConfig}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  totalFiles={items.length}
                  caseId={case_.id}
                />
              </div>
            </div>
          )}
        </Panel>
      </PanelGroup>
    </div>
  )
}
