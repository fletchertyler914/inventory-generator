import { useState, useEffect, useCallback, useRef } from "react"
import { fileService } from "@/services/fileService"
import { toast } from "@/hooks/useToast"

interface UseWorkspaceAutoSyncOptions {
  caseId: string
  enabled: boolean
  intervalMinutes: number
  preferencesLoaded: boolean
  onItemsChange: (items: any[]) => void
}

/**
 * ELITE: Auto-sync hook with intelligent interval management
 * 
 * Features:
 * - Only runs when component is mounted (case is open)
 * - Pauses when app/tab is hidden (document.hidden check)
 * - Prevents immediate sync after manual sync
 * - Resource-efficient: only one case syncs at a time
 * - Cleanup on unmount stops all timers
 */
export function useWorkspaceAutoSync({
  caseId,
  enabled,
  intervalMinutes,
  preferencesLoaded,
  onItemsChange,
}: UseWorkspaceAutoSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false)
  const lastAutoSyncTimeRef = useRef<number | null>(null)

  // Auto-sync logic
  useEffect(() => {
    if (!enabled || !preferencesLoaded) return

    const syncInterval = intervalMinutes * 60 * 1000 // Convert to milliseconds

    const performAutoSync = async () => {
      // Check if document is visible (pauses when app is inactive)
      if (document.hidden) {
        return
      }

      // Don't sync if manual sync just happened (within last minute)
      const now = Date.now()
      if (lastAutoSyncTimeRef.current && now - lastAutoSyncTimeRef.current < 60000) {
        return
      }

      // Don't sync if manual sync is in progress
      if (isSyncing) {
        return
      }

      try {
        setIsSyncing(true)
        const result = await fileService.syncCaseAllSources(caseId, true) // Incremental only

        // Reload files after sync
        const refreshedItems = await fileService.loadCaseFilesWithInventory(caseId, true)
        onItemsChange(refreshedItems)

        lastAutoSyncTimeRef.current = now

        // Show subtle notification only if files were actually changed
        if (result.files_inserted > 0 || result.files_updated > 0 || (result.files_deleted ?? 0) > 0) {
          const parts: string[] = []
          if (result.files_inserted > 0) parts.push(`${result.files_inserted} new`)
          if (result.files_updated > 0) parts.push(`${result.files_updated} updated`)
          if ((result.files_deleted ?? 0) > 0) parts.push(`${result.files_deleted} deleted (auto)`)
          
          toast({
            title: "Files synced",
            description: parts.join(", "),
            variant: "default",
            duration: 3000, // Shorter duration for auto-sync
          })
        }

        if (result.errors && result.errors.length > 0) {
          toast({
            title: "Sync completed with errors",
            description: result.errors.slice(0, 2).join(", "),
            variant: "destructive",
            duration: 4000,
          })
        }
      } catch (error) {
        // Silent failure for auto-sync (don't spam user with errors)
        console.error("Auto-sync failed:", error)
      } finally {
        setIsSyncing(false)
      }
    }

    // Initial sync after interval (don't sync immediately on mount)
    const initialTimeout = setTimeout(() => {
      performAutoSync()
    }, syncInterval)

    // Set up periodic sync
    const interval = setInterval(performAutoSync, syncInterval)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [enabled, intervalMinutes, caseId, onItemsChange, preferencesLoaded, isSyncing])

  // Manual sync handler
  const handleSyncFiles = useCallback(async () => {
    setIsSyncing(true)
    try {
      const result = await fileService.syncCaseAllSources(caseId, true)

      // Reload files after sync (cache is already cleared by syncCaseAllSources)
      const refreshedItems = await fileService.loadCaseFilesWithInventory(caseId, true)
      onItemsChange(refreshedItems)

      // Update last sync time to prevent immediate auto-sync
      lastAutoSyncTimeRef.current = Date.now()

      const parts: string[] = []
      if (result.files_inserted > 0) parts.push(`${result.files_inserted} new`)
      if (result.files_updated > 0) parts.push(`${result.files_updated} updated`)
      if (result.files_skipped > 0) parts.push(`${result.files_skipped} skipped`)
      if ((result.files_deleted ?? 0) > 0) parts.push(`${result.files_deleted} deleted (auto)`)
      
      toast({
        title: "Files synced",
        description: parts.length > 0 ? parts.join(", ") : "No changes",
        variant: "success",
      })
      
      // Show warning if files were protected (have user data)
      if ((result.files_protected ?? 0) > 0) {
        toast({
          title: "Files protected",
          description: `${result.files_protected} file(s) with notes or findings were not auto-deleted`,
          variant: "default",
          duration: 4000,
        })
      }

      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Sync completed with errors",
          description: result.errors.slice(0, 3).join(", "),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Failed to sync files",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }, [caseId, onItemsChange])

  return {
    isSyncing,
    handleSyncFiles,
  }
}

