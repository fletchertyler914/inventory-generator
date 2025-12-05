import { useMemo } from "react"

interface UseWorkspacePanelsOptions {
  notesVisible: boolean
  findingsVisible: boolean
  timelineVisible: boolean
  duplicatesVisible?: boolean
}

/**
 * ELITE: Workspace panels hook for dynamic panel sizing
 * 
 * Calculates optimal panel sizes based on which panels are visible
 * Ensures consistent layout regardless of panel combination
 */
export function useWorkspacePanels({
  notesVisible,
  findingsVisible,
  timelineVisible,
  duplicatesVisible = false,
}: UseWorkspacePanelsOptions) {
  // Calculate file viewer size based on visible panels
  const fileViewerSize = useMemo(() => {
    const visibleCount = [notesVisible, findingsVisible, timelineVisible, duplicatesVisible].filter(Boolean).length
    if (visibleCount >= 3) {
      return 35
    }
    if (visibleCount === 2) {
      return 50
    }
    if (visibleCount === 1) {
      return 60
    }
    return 100
  }, [notesVisible, findingsVisible, timelineVisible, duplicatesVisible])

  // Calculate notes panel size
  const notesPanelSize = useMemo(() => {
    const visibleCount = [notesVisible, findingsVisible, timelineVisible, duplicatesVisible].filter(Boolean).length
    if (visibleCount >= 3) {
      return 15
    }
    if (visibleCount === 2) {
      return 20
    }
    if (visibleCount === 1) {
      return 25
    }
    return 35
  }, [notesVisible, findingsVisible, timelineVisible, duplicatesVisible])

  // Calculate findings panel size
  const findingsPanelSize = useMemo(() => {
    const visibleCount = [notesVisible, findingsVisible, timelineVisible, duplicatesVisible].filter(Boolean).length
    if (visibleCount >= 3) {
      return 18
    }
    if (visibleCount === 2) {
      return 22
    }
    if (visibleCount === 1) {
      return 25
    }
    return 35
  }, [notesVisible, findingsVisible, timelineVisible, duplicatesVisible])

  // Calculate timeline panel size
  const timelinePanelSize = useMemo(() => {
    const visibleCount = [notesVisible, findingsVisible, timelineVisible, duplicatesVisible].filter(Boolean).length
    if (visibleCount >= 3) {
      return 20
    }
    if (visibleCount === 2) {
      return 30
    }
    if (visibleCount === 1) {
      return 35
    }
    return 40
  }, [notesVisible, findingsVisible, timelineVisible, duplicatesVisible])

  // Calculate duplicates panel size
  const duplicatesPanelSize = useMemo(() => {
    const visibleCount = [notesVisible, findingsVisible, timelineVisible, duplicatesVisible].filter(Boolean).length
    if (visibleCount >= 3) {
      return 20
    }
    if (visibleCount === 2) {
      return 30
    }
    if (visibleCount === 1) {
      return 35
    }
    return 40
  }, [notesVisible, findingsVisible, timelineVisible, duplicatesVisible])

  // Count visible panels
  const visiblePanelCount = useMemo(() => {
    let count = 0
    if (notesVisible) count++
    if (findingsVisible) count++
    if (timelineVisible) count++
    if (duplicatesVisible) count++
    return count
  }, [notesVisible, findingsVisible, timelineVisible, duplicatesVisible])

  return {
    fileViewerSize,
    notesPanelSize,
    findingsPanelSize,
    timelinePanelSize,
    duplicatesPanelSize,
    visiblePanelCount,
  }
}

