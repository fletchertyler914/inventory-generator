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
import { getStoreValue, setStoreValue } from "./lib/store-utils"
import { logger, logError as logAppError } from "./lib/logger"
import type { Case } from "./types/case"

/**
 * CaseSpace - Native Desktop Application
 *
 * ELITE ARCHITECTURE:
 * - Case-first workflow: Start with case list, not folder selection
 * - Integrated multi-pane layout: File viewer + Notes + Workflow Board
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
   * Handle case selection - ELITE: Load from database instantly
   * ELITE: Auto-stop current timer and start new one when switching cases
   */
  const handleCaseSelect = useCallback(
    async (case_: Case) => {
      // If switching cases, stop current timer
      if (currentCase && currentCase.id !== case_.id) {
        try {
          const { timeService } = await import("@/services/timeService")
          const activeTimer = await timeService.getActiveTimer(currentCase.id)
          if (activeTimer) {
            // Auto-stop current timer (without summary - user can add it later)
            await timeService.stopTimer(currentCase.id)
          }
        } catch (error) {
          // Silently fail - timer is not critical for case switching
          logAppError("Failed to stop timer when switching cases", error)
        }
      }

      setCurrentCase(case_)
      // Show loading screen during case loading
      setIsInitializing(true)

      // Persist last selected case ID
      try {
        await setStoreValue("casespace-last-case-id", case_.id, "settings")
      } catch (error) {
        logAppError("Failed to save last selected case", error)
      }

      try {
        // ELITE: Load files from database (blazing fast: < 100ms for thousands of files)
        const dbItems = await fileService.loadCaseFilesWithInventory(case_.id)

        if (dbItems.length > 0) {
          // Fast path: Files exist in DB
          // Cache is source of truth - hook will fetch when needed
          // Cache deduplication ensures only one request if multiple components fetch
          setItems(dbItems)
          // Get first source for selectedFolder display
          const sources = await fileService.listCaseSources(case_.id)
          setSelectedFolder(sources[0] || null)

          // Hide loading screen after cache is warmed
          setIsInitializing(false)

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

            // Ingest from all sources (duplicate detection happens during ingestion)
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
                logAppError(`Failed to ingest source ${source}`, error)
              }
            }

            // Load the ingested files
            // Cache is automatically cleared by fileService.ingestFilesToCase
            // Hook will fetch fresh duplicate data when components mount
            const ingestedItems = await fileService.loadCaseFilesWithInventory(case_.id)

            setItems(ingestedItems)
            setSelectedFolder(sources[0] || null)

            // Hide loading screen after cache is warmed with fresh data
            setIsInitializing(false)

            toast({
              title: "Files ingested",
              description: `Added ${totalInserted} new file${totalInserted !== 1 ? "s" : ""}, updated ${totalUpdated}, skipped ${totalSkipped}`,
            })
          } else {
            // No sources, just hide loading screen
            setIsInitializing(false)
          }
        }
      } catch (_error) {
        const appError = createAppError(
          _error instanceof Error ? _error : new Error("Unknown error"),
          ErrorCode.SCAN_DIRECTORY_FAILED
        )
        logError(appError, "handleCaseSelect")

        // Hide loading screen on error
        setIsInitializing(false)

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
   * Initialize app - wait for theme and React to be ready, and load last selected case
   */
  useEffect(() => {
    let mounted = true

    // Load last selected case if available
    const loadLastCase = async () => {
      try {
        const lastCaseId = await getStoreValue<string | null>(
          "casespace-last-case-id",
          null,
          "settings"
        )
        if (lastCaseId && mounted) {
          try {
            const lastCase = await caseService.getCase(lastCaseId)
            if (mounted) {
              await handleCaseSelect(lastCase)
            }
          } catch (_error) {
            // Case no longer exists, ignore
            logger.debug("Last selected case no longer exists", { lastCaseId })
          }
        }
      } catch (error) {
        logAppError("Failed to load last selected case", error)
      }
    }

    // Wait for theme initialization and initial render
    const initTimer = setTimeout(() => {
      if (mounted) {
        setIsInitializing(false)
        // Load last case after initialization
        loadLastCase()
      }
    }, 800) // Give enough time for theme detection and smooth splash display

    return () => {
      mounted = false
      clearTimeout(initTimer)
    }
  }, [handleCaseSelect])

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
      // Show loading screen during case creation and ingestion
      setIsInitializing(true)

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
          // Keep loading screen visible - will be hidden when user confirms or cancels
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

        // Hide loading screen on error
        setIsInitializing(false)

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
      // Show loading screen during ingestion
      setIsInitializing(true)

      try {
        await fileService.ingestFilesToCase(currentCase.id, pendingFolderPath, true)
        const ingestedItems = await fileService.loadCaseFilesWithInventory(currentCase.id)

        // Wait for duplicate detection to complete (it happens during ingestion, but we need to fetch the results)
        const { duplicateService } = await import("@/services/duplicateService")
        await duplicateService.findAllDuplicateGroups(currentCase.id, false)

        setItems(ingestedItems)
        setSelectedFolder(pendingFolderPath)
        setPendingFolderPath(null)
        setPendingFileCount(0)

        // Hide loading screen after duplicate detection completes
        setIsInitializing(false)

        toast({
          title: "Files ingested",
          description: `Files have been added to the case`,
        })
      } catch (error) {
        const appError = createAppError(error, ErrorCode.SCAN_DIRECTORY_FAILED)
        logError(appError, "handleWarningConfirm")

        // Hide loading screen on error
        setIsInitializing(false)

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
    setWarningDialogOpen(false)
    // Hide loading screen when user cancels
    setIsInitializing(false)
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
   * Supports both individual files and folders
   */
  const handleAddFilesToCase = useCallback(
    async (path: string) => {
      if (!currentCase) return

      try {
        // Add source to case (if not already added)
        await fileService.addCaseSource(currentCase.id, path)

        // Ingest files from the new source (backend handles both files and folders)
        const result = await fileService.ingestFilesToCase(currentCase.id, path, true)
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
