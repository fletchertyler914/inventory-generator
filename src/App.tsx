import { useState, useCallback, useEffect } from "react"
import "./index.css"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Toaster } from "./components/ui/toaster"
import { SplashScreen } from "./components/SplashScreen"
import { CaseListView } from "./components/case/CaseListView"
import { CaseWorkspace } from "./components/workspace/CaseWorkspace"
import { CreateCaseDialog } from "./components/case/CreateCaseDialog"
import { LargeFolderWarningDialog } from "./components/LargeFolderWarningDialog"
import { useInventory } from "./hooks/useInventory"
import { useInventoryStore } from "./store/inventoryStore"
import { fileService } from "./services/fileService"
import { caseService } from "./services/caseService"
import { createAppError, logError, ErrorCode } from "./lib/error-handler"
import { toast } from "./hooks/useToast"
import type { Case } from "./types/case"

/**
 * CaseSpace - Native Desktop Application
 * 
 * ELITE ARCHITECTURE:
 * - Case-first workflow: Start with case list, not folder selection
 * - Integrated multi-pane layout: File viewer + Notes + Table
 * - Zero friction: Everything 1-2 clicks away
 * - Blazing fast: Database-backed, instant case switching
 * - Native desktop only: Built with Tauri for Windows, macOS, Linux
 */
function App() {
  // App initialization state
  const [isInitializing, setIsInitializing] = useState(true)

  // Case-first state management
  const [currentCase, setCurrentCase] = useState<Case | null>(null)
  const [createCaseDialogOpen, setCreateCaseDialogOpen] = useState(false)
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [pendingFolderPath, setPendingFolderPath] = useState<string | null>(null)
  const [pendingFileCount, setPendingFileCount] = useState<number>(0)

  // Inventory state (managed by workspace when case is open)
  const {
    items,
    loading,
    selectedIndices,
    setItems,
    setSelectedIndices,
    bulkUpdateItems,
  } = useInventory()

  const { setSelectedFolder } = useInventoryStore()

  /**
   * Initialize app - wait for theme and React to be ready
   */
  useEffect(() => {
    // Wait for theme initialization and initial render
    const initTimer = setTimeout(() => {
      setIsInitializing(false)
    }, 800) // Give enough time for theme detection and smooth splash display

    return () => clearTimeout(initTimer)
  }, [])

  /**
   * Handle case selection - ELITE: Load from database instantly
   */
  const handleCaseSelect = useCallback(async (case_: Case) => {
    setCurrentCase(case_)
    
    try {
      // ELITE: Load files from database (blazing fast: < 100ms for thousands of files)
      const dbItems = await fileService.loadCaseFilesWithInventory(case_.id)
      
      if (dbItems.length > 0) {
        // Fast path: Files exist in DB
        setItems(dbItems)
        setSelectedFolder(case_.folder_path)
        toast({
          title: "Case opened",
          description: `Loaded ${dbItems.length} file${dbItems.length !== 1 ? 's' : ''}`,
        })
      } else if (case_.folder_path) {
        // No files yet, ingest from folder
        toast({
          title: "Ingesting files",
          description: "Scanning folder and storing files in database...",
        })
        
        const result = await fileService.ingestFilesToCase(case_.id, case_.folder_path, true)
        
        // Load the ingested files
        const ingestedItems = await fileService.loadCaseFilesWithInventory(case_.id)
        setItems(ingestedItems)
        setSelectedFolder(case_.folder_path)
        
        toast({
          title: "Files ingested",
          description: `Added ${result.files_inserted} new file${result.files_inserted !== 1 ? 's' : ''}, updated ${result.files_updated}, skipped ${result.files_skipped}`,
        })
      }
    } catch (_error) {
      const appError = createAppError(_error instanceof Error ? _error : new Error("Unknown error"), ErrorCode.SCAN_DIRECTORY_FAILED)
      logError(appError, "handleCaseSelect")
      toast({
        title: "Failed to load case",
        description: appError.message,
        variant: "destructive",
      })
    }
  }, [setItems, setSelectedFolder])

  /**
   * Handle case creation from dialog
   */
  const handleCreateCase = useCallback(async (
    name: string,
    folderPath: string,
    caseId?: string,
    department?: string,
    client?: string
  ) => {
    try {
      const newCase = await caseService.createCase(name, folderPath, caseId, department, client)
      
      // Check if folder has many files
      const { countDirectoryFiles } = await import('./services/inventoryService')
      const fileCount = await countDirectoryFiles(folderPath)
      
      if (fileCount > 1000) {
        setPendingFolderPath(folderPath)
        setPendingFileCount(fileCount)
        setWarningDialogOpen(true)
      } else {
        // Small folder, ingest immediately
        await handleCaseSelect(newCase)
      }
      
      setCreateCaseDialogOpen(false)
    } catch (_error) {
      const appError = createAppError(_error instanceof Error ? _error : new Error("Unknown error"), ErrorCode.CREATE_CASE_FAILED)
      logError(appError, "handleCreateCase")
      toast({
        title: "Failed to create case",
        description: appError.message,
        variant: "destructive",
      })
    }
  }, [handleCaseSelect])


  /**
   * Handle warning confirmation - proceed with ingestion
   */
  const handleWarningConfirm = useCallback(async () => {
    if (pendingFolderPath && currentCase) {
      try {
        await fileService.ingestFilesToCase(currentCase.id, pendingFolderPath, true)
        const ingestedItems = await fileService.loadCaseFilesWithInventory(currentCase.id)
        setItems(ingestedItems)
        setSelectedFolder(pendingFolderPath)
        setPendingFolderPath(null)
        setPendingFileCount(0)
        toast({
          title: "Files ingested",
          description: `Files have been added to the case`,
        })
      } catch (error) {
        const appError = createAppError(error, ErrorCode.SCAN_DIRECTORY_FAILED)
        logError(appError, "handleWarningConfirm")
        toast({
          title: "Failed to ingest files",
          description: appError.message,
          variant: "destructive",
        })
      }
    }
  }, [pendingFolderPath, currentCase, setItems, setSelectedFolder])

  /**
   * Handle warning cancel
   */
  const handleWarningCancel = useCallback(() => {
    setPendingFolderPath(null)
    setPendingFileCount(0)
  }, [])

  /**
   * Handle closing case workspace - return to case list
   */
  const handleCloseCase = useCallback(() => {
    setCurrentCase(null)
    setItems([])
    setSelectedFolder(null)
    setSelectedIndices([])
  }, [setItems, setSelectedFolder, setSelectedIndices])

  /**
   * Handle adding files to current case
   */
  const handleAddFilesToCase = useCallback(async (folderPath: string) => {
    if (!currentCase) return

    try {
      // Add source to case (if not already added)
      await fileService.addCaseSource(currentCase.id, folderPath)
      
      // Ingest files from the new source
      const result = await fileService.ingestFilesToCase(currentCase.id, folderPath, true)
      const updatedItems = await fileService.loadCaseFilesWithInventory(currentCase.id)
      setItems(updatedItems)
      
      toast({
        title: "Files added",
        description: `Added ${result.files_inserted} new file${result.files_inserted !== 1 ? 's' : ''} from new source`,
        variant: "success",
      })
    } catch (_error) {
      const appError = createAppError(_error instanceof Error ? _error : new Error("Unknown error"), ErrorCode.SCAN_DIRECTORY_FAILED)
      logError(appError, "handleAddFilesToCase")
      toast({
        title: "Failed to add files",
        description: appError.message,
        variant: "destructive",
      })
    }
  }, [currentCase, setItems])

  /**
   * Handle syncing case files - syncs ALL source folders/files for the case
   */
  const handleSyncCase = useCallback(async () => {
    if (!currentCase) return

    try {
      toast({
        title: "Syncing case",
        description: "Syncing all source folders/files...",
      })
      
      // Use new multi-source sync command
      const result = await fileService.syncCaseAllSources(currentCase.id, true)
      
      // Reload files from database
      const updatedItems = await fileService.loadCaseFilesWithInventory(currentCase.id)
      setItems(updatedItems)
      
      toast({
        title: "Case synced",
        description: `Added ${result.files_inserted} new, updated ${result.files_updated}, skipped ${result.files_skipped}`,
        variant: "success",
      })
    } catch (_error) {
      const appError = createAppError(_error instanceof Error ? _error : new Error("Unknown error"), ErrorCode.SYNC_FAILED)
      logError(appError, "handleSyncCase")
      toast({
        title: "Failed to sync case",
        description: appError.message,
        variant: "destructive",
      })
    }
  }, [currentCase, setItems])

  // Render case list view (case-first workflow)
  if (!currentCase) {
    return (
      <ErrorBoundary>
        <div className="h-screen w-screen bg-background text-foreground antialiased overflow-hidden">
          <SplashScreen isVisible={isInitializing} />
          <CaseListView
            onSelectCase={handleCaseSelect}
            onCreateCase={() => setCreateCaseDialogOpen(true)}
          />
          <CreateCaseDialog
            open={createCaseDialogOpen}
            onOpenChange={setCreateCaseDialogOpen}
            onCaseCreated={handleCreateCase}
          />
          <Toaster />
        </div>
      </ErrorBoundary>
    )
  }

  // Render case workspace (integrated multi-pane layout)
  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-background text-foreground antialiased overflow-hidden">
        <SplashScreen isVisible={isInitializing} />
        <CaseWorkspace
          case={currentCase}
          items={items}
          onItemsChange={setItems}
          selectedIndices={selectedIndices}
          onSelectionChange={setSelectedIndices}
          loading={loading}
          onCloseCase={handleCloseCase}
          onAddFiles={handleAddFilesToCase}
          onSyncCase={handleSyncCase}
          onBulkUpdate={bulkUpdateItems}
        />
        <Toaster />
        <LargeFolderWarningDialog
          open={warningDialogOpen}
          onOpenChange={setWarningDialogOpen}
          fileCount={pendingFileCount}
          onConfirm={handleWarningConfirm}
          onCancel={handleWarningCancel}
        />
      </div>
    </ErrorBoundary>
  )
}

export default App
