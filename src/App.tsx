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
  const { items, loading, selectedIndices, setItems, setSelectedIndices, bulkUpdateItems } =
    useInventory()

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
  const handleCaseSelect = useCallback(
    async (case_: Case) => {
      setCurrentCase(case_)

      try {
        // ELITE: Load files from database (blazing fast: < 100ms for thousands of files)
        const dbItems = await fileService.loadCaseFilesWithInventory(case_.id)

        if (dbItems.length > 0) {
          // Fast path: Files exist in DB
          setItems(dbItems)
          // Get first source for selectedFolder display
          const sources = await fileService.listCaseSources(case_.id)
          setSelectedFolder(sources[0] || null)
          toast({
            title: "Case opened",
            description: `Loaded ${dbItems.length} file${dbItems.length !== 1 ? "s" : ""}`,
          })
        } else {
          // No files yet, get sources and ingest
          const sources = await fileService.listCaseSources(case_.id)

          if (sources.length > 0) {
            toast({
              title: "Ingesting files",
              description: `Scanning ${sources.length} source${sources.length !== 1 ? "s" : ""} and storing files in database...`,
            })

            // Ingest from all sources
            let totalInserted = 0
            let totalUpdated = 0
            let totalSkipped = 0

            for (const source of sources) {
              try {
                const result = await fileService.ingestFilesToCase(case_.id, source, true)
                totalInserted += result.files_inserted
                totalUpdated += result.files_updated
                totalSkipped += result.files_skipped
              } catch (error) {
                console.error(`Failed to ingest source ${source}:`, error)
              }
            }

            // Load the ingested files
            const ingestedItems = await fileService.loadCaseFilesWithInventory(case_.id)
            setItems(ingestedItems)
            setSelectedFolder(sources[0] || null)

            toast({
              title: "Files ingested",
              description: `Added ${totalInserted} new file${totalInserted !== 1 ? "s" : ""}, updated ${totalUpdated}, skipped ${totalSkipped}`,
            })
          }
        }
      } catch (_error) {
        const appError = createAppError(
          _error instanceof Error ? _error : new Error("Unknown error"),
          ErrorCode.SCAN_DIRECTORY_FAILED
        )
        logError(appError, "handleCaseSelect")
        toast({
          title: "Failed to load case",
          description: appError.message,
          variant: "destructive",
        })
      }
    },
    [setItems, setSelectedFolder]
  )

  /**
   * Handle case creation from dialog
   */
  const handleCreateCase = useCallback(
    async (
      name: string,
      sources: string[],
      caseId?: string,
      department?: string,
      client?: string
    ) => {
      try {
        const newCase = await caseService.createCase(name, sources, caseId, department, client)

        // Check if any source has many files (for folders)
        const { countDirectoryFiles } = await import("./services/inventoryService")
        let totalFileCount = 0
        for (const source of sources) {
          try {
            // Try to count files if it's a directory
            const count = await countDirectoryFiles(source)
            totalFileCount += count
          } catch {
            // Ignore errors for files or inaccessible paths
          }
        }

        if (totalFileCount > 1000) {
          // For now, use first source for pending (could be enhanced to handle multiple)
          setPendingFolderPath(sources[0] || null)
          setPendingFileCount(totalFileCount)
          setWarningDialogOpen(true)
        } else {
          // Small sources, ingest immediately
          await handleCaseSelect(newCase)
        }

        setCreateCaseDialogOpen(false)
      } catch (_error) {
        const appError = createAppError(
          _error instanceof Error ? _error : new Error("Unknown error"),
          ErrorCode.CREATE_CASE_FAILED
        )
        logError(appError, "handleCreateCase")
        toast({
          title: "Failed to create case",
          description: appError.message,
          variant: "destructive",
        })
      }
    },
    [handleCaseSelect]
  )

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
  const handleAddFilesToCase = useCallback(
    async (folderPath: string) => {
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
          description: `Added ${result.files_inserted} new file${result.files_inserted !== 1 ? "s" : ""} from new source`,
          variant: "success",
        })
      } catch (_error) {
        const appError = createAppError(
          _error instanceof Error ? _error : new Error("Unknown error"),
          ErrorCode.SCAN_DIRECTORY_FAILED
        )
        logError(appError, "handleAddFilesToCase")
        toast({
          title: "Failed to add files",
          description: appError.message,
          variant: "destructive",
        })
      }
    },
    [currentCase, setItems]
  )

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
