import { useRef, useState } from "react"
import "./index.css"
import { DesktopLayout, type DesktopLayoutRef } from "./components/layout/DesktopLayout"
import { LargeFolderWarningDialog } from "./components/LargeFolderWarningDialog"
import { useInventory } from "./hooks/useInventory"
import { useRecentInventories } from "./hooks/useRecentInventories"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import { useInventoryStore } from "./store/inventoryStore"
import { importInventory, countDirectoryFiles } from "./services/inventoryService"
import { createAppError, logError, ErrorCode } from "./lib/error-handler"
import { toast } from "./hooks/useToast"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Toaster } from "./components/ui/toaster"
import type { InventoryItem } from "./types/inventory"
import type { RecentInventory } from "./hooks/useRecentInventories"

function App() {
  const {
    items,
    loading,
    selectedFolder,
    caseNumber,
    selectedIndices,
    scanFolder,
    syncFolder,
    setItems,
    setCaseNumber,
    setSelectedIndices,
    bulkUpdateItems,
  } = useInventory()
  
  const { setSelectedFolder } = useInventoryStore()
  
  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [pendingFolderPath, setPendingFolderPath] = useState<string | null>(null)
  const [pendingFileCount, setPendingFileCount] = useState<number>(0)
  
  const {
    exportDialogOpen,
    importDialogOpen,
    setExportDialogOpen,
    setImportDialogOpen,
  } = useInventoryStore()
  
  const {
    recentInventories,
    addRecentInventory,
    removeRecentInventory,
    updateLastOpened,
  } = useRecentInventories()

  const bulkDateInputRef = useRef<HTMLInputElement>(null)
  const desktopLayoutRef = useRef<DesktopLayoutRef>(null)

  const handleFolderSelected = async (path: string) => {
    try {
      const result = await scanFolder(path)
      if (result.shouldShowWarning) {
        setPendingFolderPath(path)
        setPendingFileCount(result.fileCount || 0)
        setWarningDialogOpen(true)
      }
    } catch (error) {
      // Error already handled in scanFolder with toast
    }
  }
  
  const handleWarningConfirm = async () => {
    if (pendingFolderPath) {
      try {
        // Now scan with warning skipped
        await scanFolder(pendingFolderPath, true)
      } catch (error) {
        // Error already handled
      }
      setPendingFolderPath(null)
      setPendingFileCount(0)
    }
  }
  
  const handleWarningCancel = () => {
    setPendingFolderPath(null)
    setPendingFileCount(0)
    // Clear selected folder if user cancels
    if (selectedFolder) {
      setItems([])
    }
  }

  const handleBulkSetDateRcvd = (date: string, indices?: number[]) => {
    bulkUpdateItems({ date_rcvd: date }, indices || selectedIndices)
  }

  const handleExportComplete = (
    filePath: string,
    items: InventoryItem[],
    caseNumber: string | null,
    folderPath: string | null
  ) => {
    addRecentInventory(filePath, items, caseNumber, folderPath || selectedFolder)
  }

  const handleImportComplete = async (
    filePath: string,
    items: InventoryItem[],
    caseNumber: string | null,
    folderPath: string | null
  ) => {
    // Clear previously selected folder
    if (selectedFolder) {
      setSelectedFolder(null)
    }
    
    addRecentInventory(filePath, items, caseNumber, folderPath || null)
    
    // If folder_path was restored from metadata, validate and set it as selected folder
    if (folderPath) {
      try {
        // Validate folder exists by trying to count files
        await countDirectoryFiles(folderPath)
        // Folder exists, scan it
        await scanFolder(folderPath)
      } catch (error) {
        // Folder doesn't exist or is invalid
        const appError = createAppError(error, ErrorCode.FILE_NOT_FOUND)
        logError(appError, "handleImportComplete")
        toast({
          title: "Folder path not found",
          description: `The folder path "${folderPath}" from the imported file no longer exists on your system.`,
          variant: "destructive",
        })
        // Set sync status to null since folder doesn't exist
        useInventoryStore.getState().setSyncStatus(null)
      }
    }
  }
  
  const handleFolderPathRestored = async (folderPath: string) => {
    // Clear previously selected folder
    if (selectedFolder) {
      setSelectedFolder(null)
    }
    
    // When importing, if folder_path is restored from metadata, validate and set it as selected folder
    try {
      // Validate folder exists by trying to count files
      await countDirectoryFiles(folderPath)
      // Folder exists, scan it
      await scanFolder(folderPath)
    } catch (error) {
      // Folder doesn't exist or is invalid
      const appError = createAppError(error, ErrorCode.FILE_NOT_FOUND)
      logError(appError, "handleFolderPathRestored")
      toast({
        title: "Folder path not found",
        description: `The folder path "${folderPath}" from the imported file no longer exists on your system.`,
        variant: "destructive",
      })
      // Set sync status to null since folder doesn't exist
      useInventoryStore.getState().setSyncStatus(null)
    }
  }
  
  const handleSyncInventory = async () => {
    if (!selectedFolder) return
    
    try {
      await syncFolder(selectedFolder)
    } catch (error) {
      // Error already handled in syncFolder with toast
    }
  }

  const handleOpenRecentInventory = async (inventory: RecentInventory) => {
    try {
      // Update last opened timestamp
      updateLastOpened(inventory.filePath)

      // Detect format from file extension
      const pathLower = inventory.filePath.toLowerCase()
      let format: string | undefined
      if (pathLower.endsWith(".xlsx")) {
        format = "xlsx"
      } else if (pathLower.endsWith(".csv")) {
        format = "csv"
      } else if (pathLower.endsWith(".json")) {
        format = "json"
      }

      const result = await importInventory(inventory.filePath, format)

      // Update items and case number
      setItems(result.items)
      if (result.case_number) {
        setCaseNumber(result.case_number)
      }
      
      // Clear previously selected folder
      if (selectedFolder) {
        setSelectedFolder(null)
      }
      
      // If folder_path was restored, validate and set it as selected folder
      if (result.folder_path) {
        try {
          // Validate folder exists by trying to count files
          await countDirectoryFiles(result.folder_path)
          // Folder exists, scan it
          await scanFolder(result.folder_path)
        } catch (error) {
          // Folder doesn't exist or is invalid
          const appError = createAppError(error, ErrorCode.FILE_NOT_FOUND)
          logError(appError, "handleOpenRecentInventory")
          toast({
            title: "Folder path not found",
            description: `The folder path "${result.folder_path}" from the inventory file no longer exists on your system.`,
            variant: "destructive",
          })
          // Set sync status to null since folder doesn't exist
          useInventoryStore.getState().setSyncStatus(null)
        }
      }
      
      toast({
        title: "Inventory loaded",
        description: `Loaded ${result.items.length} item${result.items.length !== 1 ? 's' : ''}`,
        variant: "success",
      })
    } catch (error) {
      const appError = createAppError(error, ErrorCode.IMPORT_FAILED)
      logError(appError, "handleOpenRecentInventory")
      toast({
        title: "Failed to open inventory",
        description: appError.message,
        variant: "destructive",
      })
    }
  }

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onExport: () => {
      if (items.length > 0 && !loading) {
        setExportDialogOpen(true)
      }
    },
    onImport: () => {
      if (!loading) {
        setImportDialogOpen(true)
      }
    },
    onSelectAll: () => {
      if (items.length > 0) {
        setSelectedIndices(items.map((_, i) => i))
      }
    },
    onClearSelection: () => {
      setSelectedIndices([])
    },
    onBulkDateFocus: () => {
      bulkDateInputRef.current?.focus()
    },
    onToggleSidebar: () => {
      desktopLayoutRef.current?.toggleSidebar()
    },
  })

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-background text-foreground antialiased overflow-hidden">
        <DesktopLayout
          ref={desktopLayoutRef}
          items={items}
          onItemsChange={setItems}
          caseNumber={caseNumber}
          onCaseNumberChange={setCaseNumber}
          onBulkSetDateRcvd={handleBulkSetDateRcvd}
          selectedIndices={selectedIndices}
          onSelectionChange={setSelectedIndices}
          loading={loading}
          selectedFolder={selectedFolder}
          onFolderSelected={handleFolderSelected}
          recentInventories={recentInventories}
          onOpenRecentInventory={handleOpenRecentInventory}
          onRemoveRecentInventory={removeRecentInventory}
          onExportComplete={handleExportComplete}
          onImportComplete={handleImportComplete}
          onFolderPathRestored={handleFolderPathRestored}
          onSyncInventory={handleSyncInventory}
          exportDialogOpen={exportDialogOpen}
          onExportDialogOpenChange={setExportDialogOpen}
          importDialogOpen={importDialogOpen}
          onImportDialogOpenChange={setImportDialogOpen}
          bulkDateInputRef={bulkDateInputRef}
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
