/**
 * Custom hook for inventory operations
 * Now uses Zustand store for state management
 */

import { useCallback, useMemo } from "react"
import { useInventoryStore } from "@/store/inventoryStore"
import { countDirectoryFiles, scanDirectory, syncInventory } from "@/services/inventoryService"
import { createAppError, logError, ErrorCode } from "@/lib/error-handler"
import { toast } from "./useToast"
import type { InventoryItem } from "@/types/inventory"

export function useInventory() {
  const store = useInventoryStore()

  const scanFolder = useCallback(async (path: string, skipWarning = false): Promise<{ items: InventoryItem[], shouldShowWarning: boolean, fileCount?: number }> => {
    store.setScanning(true)
    store.setSelectedFolder(path)
    
    try {
      // First, quickly count files to check if we need to show warning
      let fileCount: number | null = null
      if (!skipWarning) {
        try {
          fileCount = await countDirectoryFiles(path)
          // If 100+ files, show warning before scanning
          if (fileCount >= 100) {
            store.setScanning(false)
            return { items: [], shouldShowWarning: true, fileCount }
          }
        } catch (error) {
          // If count fails, proceed with scan anyway
          // Error is non-critical, so we continue with full scan
        }
      }
      
      // Proceed with full scan
      const scannedItems = await scanDirectory(path)
      
      // If skipping warning or count < 100, proceed normally
      store.setItems(scannedItems)
      toast({
        title: "Folder scanned successfully",
        description: `Found ${scannedItems.length} file${scannedItems.length !== 1 ? 's' : ''}`,
        variant: "success",
      })
      store.setScanning(false)
      return { items: scannedItems, shouldShowWarning: false, fileCount: scannedItems.length }
    } catch (error) {
      store.setScanning(false)
      const appError = createAppError(error, ErrorCode.SCAN_DIRECTORY_FAILED)
      logError(appError, "scanFolder")
      toast({
        title: "Failed to scan folder",
        description: appError.message,
        variant: "destructive",
      })
      throw appError
    }
  }, [store])
  
  

  const syncFolder = useCallback(async (folderPath: string) => {
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
      // Sync completed successfully
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
  }, [store])

  // Memoize returned object to prevent unnecessary re-renders
  return useMemo(() => ({
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
  }), [
    store.items,
    store.loading,
    store.selectedFolder,
    store.caseNumber,
    store.selectedIndices,
    store.setItems,
    store.updateItem,
    store.bulkUpdateItems,
    store.setCaseNumber,
    store.setSelectedIndices,
    scanFolder,
    syncFolder,
  ])
}
