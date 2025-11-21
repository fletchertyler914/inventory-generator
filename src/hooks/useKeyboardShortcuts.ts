import { useEffect } from "react"

interface KeyboardShortcuts {
  onExport?: () => void
  onImport?: () => void
  onSelectAll?: () => void
  onClearSelection?: () => void
  onBulkDateFocus?: () => void
  onToggleSidebar?: () => void
}

// Detect if running on macOS
function isMacOS(): boolean {
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
}

export function useKeyboardShortcuts({
  onExport,
  onImport,
  onSelectAll,
  onClearSelection,
  onBulkDateFocus,
  onToggleSidebar,
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || 
                      target.tagName === "TEXTAREA" || 
                      target.isContentEditable

      const isMac = isMacOS()
      const modifier = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd + A: Select All (works even in inputs, but we check if it's a text input)
      if (modifier && e.key.toLowerCase() === "a") {
        // Only prevent default and handle if NOT in a text input/textarea
        // This allows normal text selection in inputs, but selects table rows when not in input
        if (!isInput) {
          e.preventDefault()
          onSelectAll?.()
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
        onExport?.()
        return
      }

      // Ctrl/Cmd + O: Load Inventory
      if (modifier && e.key.toLowerCase() === "o") {
        e.preventDefault()
        onImport?.()
        return
      }

      // Escape: Clear Selection
      if (e.key === "Escape") {
        onClearSelection?.()
        return
      }

      // Ctrl/Cmd + D: Focus bulk date input
      if (modifier && e.key.toLowerCase() === "d") {
        e.preventDefault()
        onBulkDateFocus?.()
        return
      }

      // Ctrl/Cmd + B: Toggle sidebar
      if (modifier && e.key.toLowerCase() === "b") {
        e.preventDefault()
        onToggleSidebar?.()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onExport, onImport, onSelectAll, onClearSelection, onBulkDateFocus, onToggleSidebar])
}

