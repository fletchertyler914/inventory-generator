import { useEffect, useRef } from "react"

interface KeyboardShortcuts {
  onExport?: () => void
  onImport?: () => void
  onSelectAll?: () => void
  onClearSelection?: () => void
  onBulkDateFocus?: () => void
  onToggleSidebar?: () => void
}

// Memoize platform detection outside component
const isMacOS = ((): boolean => {
  if (typeof navigator === "undefined") return false
  
  // Try modern API first (userAgentData is experimental and may not be in types)
  const nav = navigator as Navigator & { userAgentData?: { platform: string } }
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "macos"
  }
  
  // Fallback to userAgent
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("mac os x") || userAgent.includes("macintosh")) {
    return true
  }
  
  // Fallback to platform
  const platform = navigator.platform?.toUpperCase() || ""
  return platform.indexOf("MAC") >= 0
})()

export function useKeyboardShortcuts({
  onExport,
  onImport,
  onSelectAll,
  onClearSelection,
  onBulkDateFocus,
  onToggleSidebar,
}: KeyboardShortcuts) {
  // Use refs for callbacks to avoid effect re-registration
  const onExportRef = useRef(onExport)
  const onImportRef = useRef(onImport)
  const onSelectAllRef = useRef(onSelectAll)
  const onClearSelectionRef = useRef(onClearSelection)
  const onBulkDateFocusRef = useRef(onBulkDateFocus)
  const onToggleSidebarRef = useRef(onToggleSidebar)

  // Keep refs in sync
  useEffect(() => {
    onExportRef.current = onExport
    onImportRef.current = onImport
    onSelectAllRef.current = onSelectAll
    onClearSelectionRef.current = onClearSelection
    onBulkDateFocusRef.current = onBulkDateFocus
    onToggleSidebarRef.current = onToggleSidebar
  }, [onExport, onImport, onSelectAll, onClearSelection, onBulkDateFocus, onToggleSidebar])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || 
                      target.tagName === "TEXTAREA" || 
                      target.isContentEditable

      const modifier = isMacOS ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd + A: Select All (works even in inputs, but we check if it's a text input)
      if (modifier && e.key.toLowerCase() === "a") {
        // Only prevent default and handle if NOT in a text input/textarea
        // This allows normal text selection in inputs, but selects table rows when not in input
        if (!isInput) {
          e.preventDefault()
          onSelectAllRef.current?.()
          return
        }
        // If in input, let browser handle it (normal text selection)
        return
      }

      // For other shortcuts, don't work in inputs
      if (isInput) {
        return
      }

      // Ctrl/Cmd + S: Create Inventory
      if (modifier && e.key.toLowerCase() === "s") {
        e.preventDefault()
        onExportRef.current?.()
        return
      }

      // Ctrl/Cmd + O: Load Inventory
      if (modifier && e.key.toLowerCase() === "o") {
        e.preventDefault()
        onImportRef.current?.()
        return
      }

      // Escape: Clear Selection
      if (e.key === "Escape") {
        onClearSelectionRef.current?.()
        return
      }

      // Ctrl/Cmd + D: Focus bulk date input
      if (modifier && e.key.toLowerCase() === "d") {
        e.preventDefault()
        onBulkDateFocusRef.current?.()
        return
      }

      // Ctrl/Cmd + B: Toggle sidebar
      if (modifier && e.key.toLowerCase() === "b") {
        e.preventDefault()
        onToggleSidebarRef.current?.()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, []) // Empty dependency array since we use refs
}

