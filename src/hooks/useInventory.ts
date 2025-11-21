/**
 * Custom hook for inventory operations
 * Now uses Zustand store for state management
 */

import { useEffect, useCallback, useRef } from "react"
import { useInventoryStore } from "@/store/inventoryStore"
import { useSettingsStore } from "@/store/settingsStore"
import { countDirectoryFiles, scanDirectory, syncInventory } from "@/services/inventoryService"
import { createAppError, logError, ErrorCode } from "@/lib/error-handler"
import { toast } from "./useToast"
import type { InventoryItem } from "@/types/inventory"

export function useInventory() {
  const store = useInventoryStore()
  const selectedFolder = store.selectedFolder
  const items = store.items

  const checkSyncStatus = useCallback(async (): Promise<'synced' | 'out_of_sync' | null> => {
    if (!selectedFolder) {
      store.setSyncStatus(null)
      return null
    }
    
    try {
      const folderFileCount = await countDirectoryFiles(selectedFolder)
      const inventoryCount = items.length
      
      const status = folderFileCount === inventoryCount ? 'synced' : 'out_of_sync'
      store.setSyncStatus(status, folderFileCount)
      return status
    } catch (error) {
      // If we can't check, set status to null
      store.setSyncStatus(null)
      return null
    }
  }, [selectedFolder, items.length, store])

  const scanFolder = async (path: string, skipWarning = false): Promise<{ items: InventoryItem[], shouldShowWarning: boolean, fileCount?: number }> => {
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
          console.warn("Failed to count files, proceeding with scan:", error)
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
      // Check sync status after scan (should be synced)
      await checkSyncStatus()
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
      // Check sync status after sync
      await checkSyncStatus()
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

  // Debounced effect to check sync status when items.length changes
  useEffect(() => {
    if (!selectedFolder) {
      return
    }
    
    const timeoutId = setTimeout(() => {
      checkSyncStatus()
    }, 500) // 500ms debounce
    
    return () => clearTimeout(timeoutId)
  }, [items.length, selectedFolder, checkSyncStatus])

  // Polling effect for sync status
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckTimeRef = useRef<number>(0)
  const lastFileCountRef = useRef<number | null>(null)
  const isCheckingRef = useRef<boolean>(false)
  
  const syncPollingEnabled = useSettingsStore(state => state.syncPollingEnabled)
  const syncPollingInterval = useSettingsStore(state => state.syncPollingInterval)

  useEffect(() => {
    // Clear any existing polling
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    // Only poll if folder is selected, polling is enabled, and app is active
    if (!selectedFolder || !syncPollingEnabled) {
      return
    }

    const poll = async () => {
      // Skip if already checking
      if (isCheckingRef.current) {
        scheduleNextPoll()
        return
      }

      // Skip if we just checked recently (within 1 second)
      const now = Date.now()
      if (now - lastCheckTimeRef.current < 1000) {
        scheduleNextPoll()
        return
      }

      isCheckingRef.current = true
      lastCheckTimeRef.current = now

      try {
        const startTime = Date.now()
        const folderFileCount = await countDirectoryFiles(selectedFolder)
        const checkDuration = Date.now() - startTime

        // If check took too long (>2 seconds), skip next poll to avoid blocking
        if (checkDuration > 2000) {
          console.warn("Sync status check took too long, skipping next poll")
          scheduleNextPoll(syncPollingInterval * 2) // Double the interval
          isCheckingRef.current = false
          return
        }

        // If file count hasn't changed, we can skip updating status
        if (lastFileCountRef.current === folderFileCount) {
          isCheckingRef.current = false
          scheduleNextPoll()
          return
        }

        lastFileCountRef.current = folderFileCount
        const inventoryCount = items.length
        const status = folderFileCount === inventoryCount ? 'synced' : 'out_of_sync'
        useInventoryStore.getState().setSyncStatus(status, folderFileCount)
      } catch (error) {
        // If we can't check, set status to null and continue polling
        useInventoryStore.getState().setSyncStatus(null)
        console.warn("Failed to check sync status during polling:", error)
      } finally {
        isCheckingRef.current = false
        scheduleNextPoll()
      }
    }

    const scheduleNextPoll = (interval?: number) => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
      pollingTimeoutRef.current = setTimeout(() => {
        poll()
      }, interval ?? syncPollingInterval)
    }

    // Start polling
    scheduleNextPoll()

    // Cleanup on unmount or when dependencies change
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
      isCheckingRef.current = false
    }
  }, [selectedFolder, syncPollingEnabled, syncPollingInterval, items.length])

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
    checkSyncStatus,
  }
}
