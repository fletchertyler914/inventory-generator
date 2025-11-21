import { useEffect } from "react"

interface KeyboardShortcuts {
  onExport?: () => void
  onImport?: () => void
  onSelectAll?: () => void
  onClearSelection?: () => void
  onBulkDateFocus?: () => void
}

export function useKeyboardShortcuts({
  onExport,
  onImport,
  onSelectAll,
  onClearSelection,
  onBulkDateFocus,
}: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd + S: Export
      if (modifier && e.key === "s") {
        e.preventDefault()
        onExport?.()
        return
      }

      // Ctrl/Cmd + O: Import
      if (modifier && e.key === "o") {
        e.preventDefault()
        onImport?.()
        return
      }

      // Ctrl/Cmd + A: Select All (only if not in input)
      if (modifier && e.key === "a" && !target.tagName.match(/INPUT|TEXTAREA/)) {
        e.preventDefault()
        onSelectAll?.()
        return
      }

      // Escape: Clear Selection
      if (e.key === "Escape") {
        onClearSelection?.()
        return
      }

      // Ctrl/Cmd + D: Focus bulk date input
      if (modifier && e.key === "d") {
        e.preventDefault()
        onBulkDateFocus?.()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onExport, onImport, onSelectAll, onClearSelection, onBulkDateFocus])
}

