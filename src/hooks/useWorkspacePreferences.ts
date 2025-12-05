import { useState, useEffect, useCallback } from "react"
import { workspacePreferencesService } from "@/services/workspacePreferencesService"
import { useDebounce } from "@/hooks/useDebounce"
import type { WorkspacePreferences } from "@/services/workspacePreferencesService"

/**
 * ELITE: Workspace preferences hook with database persistence
 * 
 * Features:
 * - Loads preferences from database on mount
 * - Debounced saving to prevent excessive writes
 * - Handles loading state and errors gracefully
 * - Returns preferences object and individual setters
 */
export function useWorkspacePreferences(caseId: string) {
  const defaults = workspacePreferencesService.getDefaultPreferences()
  
  const [preferences, setPreferences] = useState<WorkspacePreferences>(defaults)
  const [isLoading, setIsLoading] = useState(true)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  // Load preferences from database on mount
  useEffect(() => {
    let mounted = true

    const loadPreferences = async () => {
      try {
        const prefs = await workspacePreferencesService.getPreferences(caseId)
        
        if (mounted) {
          if (prefs) {
            setPreferences(prefs)
          } else {
            // Use defaults if no preferences found
            setPreferences(defaults)
          }
          setPreferencesLoaded(true)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Failed to load workspace preferences:", error)
        if (mounted) {
          setPreferences(defaults)
          setPreferencesLoaded(true)
          setIsLoading(false)
        }
      }
    }

    loadPreferences()

    return () => {
      mounted = false
    }
  }, [caseId])

  // Debounce preferences for saving
  const debouncedPreferences = useDebounce(preferences, 500)

  // Save preferences to database (debounced)
  useEffect(() => {
    if (!preferencesLoaded) return // Don't save during initial load

    const savePreferences = async () => {
      try {
        await workspacePreferencesService.savePreferences(caseId, debouncedPreferences)
      } catch (error) {
        console.error("Failed to save workspace preferences:", error)
      }
    }

    savePreferences()
  }, [caseId, debouncedPreferences, preferencesLoaded])

  // Individual setters for convenience
  const setViewMode = useCallback((mode: "split" | "board") => {
    setPreferences((prev) => ({ ...prev, view_mode: mode }))
  }, [])

  const setReportMode = useCallback((mode: boolean) => {
    setPreferences((prev) => ({ ...prev, report_mode: mode }))
  }, [])

  const setNavigatorOpen = useCallback((open: boolean) => {
    setPreferences((prev) => ({ ...prev, navigator_open: open }))
  }, [])

  const setNotesVisible = useCallback((visible: boolean) => {
    setPreferences((prev) => ({ ...prev, notes_visible: visible }))
  }, [])

  const setFindingsVisible = useCallback((visible: boolean) => {
    setPreferences((prev) => ({ ...prev, findings_visible: visible }))
  }, [])

  const setTimelineVisible = useCallback((visible: boolean) => {
    setPreferences((prev) => ({ ...prev, timeline_visible: visible }))
  }, [])

  const setDuplicatesVisible = useCallback((visible: boolean) => {
    setPreferences((prev) => ({ ...prev, duplicates_visible: visible }))
  }, [])

  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, auto_sync_enabled: enabled }))
  }, [])

  const setAutoSyncIntervalMinutes = useCallback((minutes: number) => {
    setPreferences((prev) => ({ ...prev, auto_sync_interval_minutes: minutes }))
  }, [])

  // Toggle helpers
  const toggleReportMode = useCallback(() => {
    setPreferences((prev) => ({ ...prev, report_mode: !prev.report_mode }))
  }, [])

  const toggleNotes = useCallback(() => {
    setPreferences((prev) => ({ ...prev, notes_visible: !prev.notes_visible }))
  }, [])

  const toggleFindings = useCallback(() => {
    setPreferences((prev) => ({ ...prev, findings_visible: !prev.findings_visible }))
  }, [])

  const toggleTimeline = useCallback(() => {
    setPreferences((prev) => ({ ...prev, timeline_visible: !prev.timeline_visible }))
  }, [])

  const toggleDuplicates = useCallback(() => {
    setPreferences((prev) => ({ ...prev, duplicates_visible: !(prev.duplicates_visible ?? false) }))
  }, [])

  const toggleNavigator = useCallback(() => {
    setPreferences((prev) => ({ ...prev, navigator_open: !prev.navigator_open }))
  }, [])

  const toggleAutoSync = useCallback(() => {
    setPreferences((prev) => ({ ...prev, auto_sync_enabled: !(prev.auto_sync_enabled ?? true) }))
  }, [])

  return {
    preferences,
    setPreferences,
    isLoading,
    preferencesLoaded,
    // Individual setters
    setViewMode,
    setReportMode,
    setNavigatorOpen,
    setNotesVisible,
    setFindingsVisible,
    setTimelineVisible,
    setDuplicatesVisible,
    setAutoSyncEnabled,
    setAutoSyncIntervalMinutes,
    // Toggle helpers
    toggleReportMode,
    toggleNotes,
    toggleFindings,
    toggleTimeline,
    toggleDuplicates,
    toggleNavigator,
    toggleAutoSync,
  }
}

