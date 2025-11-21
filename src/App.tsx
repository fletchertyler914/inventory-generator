import { useRef } from "react"
import "./index.css"
import { DesktopLayout } from "./components/layout/DesktopLayout"
import { useInventory } from "./hooks/useInventory"
import { useRecentInventories } from "./hooks/useRecentInventories"
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import { useInventoryStore } from "./store/inventoryStore"
import { importInventory } from "./services/inventoryService"
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

  const handleFolderSelected = async (path: string) => {
    try {
      await scanFolder(path)
    } catch (error) {
      // Error already handled in scanFolder with toast
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
    addRecentInventory(filePath, items, caseNumber, folderPath || selectedFolder)
    
    // If folder_path was restored from metadata, set it as selected folder
    if (folderPath) {
      try {
        await scanFolder(folderPath)
      } catch (error) {
        // Error already handled in scanFolder
      }
    }
  }
  
  const handleFolderPathRestored = async (folderPath: string) => {
    // When importing, if folder_path is restored from metadata, set it as selected folder
    try {
      await scanFolder(folderPath)
    } catch (error) {
      // Error already handled in scanFolder
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
      
      // If folder_path was restored, set it as selected folder
      if (result.folder_path) {
        try {
          await scanFolder(result.folder_path)
        } catch (error) {
          // Error already handled
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
  })

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-background text-foreground antialiased overflow-hidden">
        <DesktopLayout
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
      </div>
    </ErrorBoundary>
  )
}

export default App
