/**
 * Custom hook for inventory operations
 * Now uses Zustand store for state management
 */

import { useInventoryStore } from "@/store/inventoryStore"
import { scanDirectory, syncInventory } from "@/services/inventoryService"
import { createAppError, logError, ErrorCode } from "@/lib/error-handler"
import { toast } from "./useToast"

export function useInventory() {
  const store = useInventoryStore()

  const scanFolder = async (path: string) => {
    store.setScanning(true)
    store.setSelectedFolder(path)
    
    try {
      const scannedItems = await scanDirectory(path)
      store.setItems(scannedItems)
      toast({
        title: "Folder scanned successfully",
        description: `Found ${scannedItems.length} file${scannedItems.length !== 1 ? 's' : ''}`,
        variant: "success",
      })
    } catch (error) {
      const appError = createAppError(error, ErrorCode.SCAN_DIRECTORY_FAILED)
      logError(appError, "scanFolder")
      toast({
        title: "Failed to scan folder",
        description: appError.message,
        variant: "destructive",
      })
      throw appError
    } finally {
      store.setScanning(false)
    }
  }

  const syncFolder = async (folderPath: string) => {
    if (!folderPath) {
      toast({
        title: "No folder selected",
        description: "Please select a folder first.",
        variant: "warning",
      })
      return
    }
    
    if (store.items.length === 0) {
      toast({
        title: "No inventory loaded",
        description: "Please import or scan a folder first.",
        variant: "warning",
      })
      return
    }
    
    store.setSyncing(true)
    
    try {
      const syncedItems = await syncInventory(folderPath, store.items)
      store.setItems(syncedItems)
      toast({
        title: "Inventory synced",
        description: `${syncedItems.length} item${syncedItems.length !== 1 ? 's' : ''} found.`,
        variant: "success",
      })
    } catch (error) {
      const appError = createAppError(error, ErrorCode.SYNC_FAILED)
      logError(appError, "syncFolder")
      toast({
        title: "Failed to sync inventory",
        description: appError.message,
        variant: "destructive",
      })
      throw appError
    } finally {
      store.setSyncing(false)
    }
  }

  return {
    // State from store
    items: store.items,
    loading: store.loading,
    selectedFolder: store.selectedFolder,
    caseNumber: store.caseNumber,
    selectedIndices: store.selectedIndices,
    
    // Actions from store
    setItems: store.setItems,
    updateItem: store.updateItem,
    bulkUpdateItems: store.bulkUpdateItems,
    setCaseNumber: store.setCaseNumber,
    setSelectedIndices: store.setSelectedIndices,
    
    // Operations
    scanFolder,
    syncFolder,
  }
}
