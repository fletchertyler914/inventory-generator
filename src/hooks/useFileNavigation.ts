import { useState, useCallback, useEffect, useMemo } from "react"
import { getStoreValue, setStoreValue } from "@/lib/store-utils"
import { getFlattenedFileList } from "@/lib/file-tree-utils"
import type { InventoryItem } from "@/types/inventory"

interface UseFileNavigationOptions {
  caseId: string
  items: InventoryItem[]
  preferencesLoaded: boolean
  viewMode: "split" | "board"
  onViewModeChange: (mode: "split" | "board") => void
}

/**
 * ELITE: File navigation hook with persistence
 * 
 * Features:
 * - File selection with last file persistence
 * - Next/previous navigation through flattened file list
 * - Automatic view mode switching when file is selected
 * - Last file restoration on mount (if in split view)
 */
export function useFileNavigation({
  caseId,
  items,
  preferencesLoaded,
  viewMode,
  onViewModeChange,
}: UseFileNavigationOptions) {
  const [viewingFile, setViewingFile] = useState<InventoryItem | null>(null)
  const [lastSelectedFile, setLastSelectedFile] = useState<InventoryItem | null>(null)
  const [lastFileLoaded, setLastFileLoaded] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  // Build flattened file list (memoized)
  const flattenedFileList = useMemo(() => {
    return getFlattenedFileList(items)
  }, [items])

  // Load last selected file on mount (only if in split view mode)
  useEffect(() => {
    if (!preferencesLoaded) {
      setLastFileLoaded(true)
      return
    }

    // Only load last file if we're switching to split view and don't have a file selected
    if (viewMode === "split" && !viewingFile) {
      let mounted = true

      const loadLastFile = async () => {
        try {
          const lastFilePath = await getStoreValue<string | null>(
            `casespace-last-file-${caseId}`,
            null,
            "settings"
          )

          if (mounted && lastFilePath) {
            const lastFile = items.find((item) => item.absolute_path === lastFilePath)
            if (lastFile) {
              setLastSelectedFile(lastFile)
              setViewingFile(lastFile)
            }
          }
          setLastFileLoaded(true)
        } catch (error) {
          console.error("Failed to load last selected file:", error)
          if (mounted) {
            setLastFileLoaded(true)
          }
        }
      }

      loadLastFile()

      return () => {
        mounted = false
      }
    } else {
      setLastFileLoaded(true)
    }
  }, [caseId, items, preferencesLoaded, viewMode, viewingFile])

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: InventoryItem) => {
      setViewingFile(file)
      setLastSelectedFile(file)
      // Clear any selected note to prevent note dialog from opening
      setSelectedNoteId(null)
      // Persist last selected file to store
      if (lastFileLoaded) {
        try {
          await setStoreValue(`casespace-last-file-${caseId}`, file.absolute_path, "settings")
        } catch (error) {
          console.error("Failed to save last selected file:", error)
        }
      }
      // Automatically switch to split view when a file is selected
      if (viewMode !== "split") {
        onViewModeChange("split")
      }
    },
    [caseId, lastFileLoaded, viewMode, onViewModeChange]
  )

  // Handle file close
  const handleFileClose = useCallback(() => {
    setViewingFile(null)
    onViewModeChange("board")
  }, [onViewModeChange])

  // Handle file open by path
  const handleFileOpen = useCallback(
    (filePath: string) => {
      const file = items.find((item) => item.absolute_path === filePath)
      if (file) {
        handleFileSelect(file)
      }
    },
    [items, handleFileSelect]
  )

  // Navigation handlers
  const handleNextFile = useCallback(() => {
    if (!viewingFile) return

    const currentIndex = flattenedFileList.findIndex(
      (f) => f.absolute_path === viewingFile.absolute_path
    )
    const nextFile =
      currentIndex >= 0 && currentIndex < flattenedFileList.length - 1
        ? flattenedFileList[currentIndex + 1]
        : undefined
    if (nextFile) {
      handleFileSelect(nextFile)
    }
  }, [flattenedFileList, viewingFile, handleFileSelect])

  const handlePreviousFile = useCallback(() => {
    if (!viewingFile) return

    const currentIndex = flattenedFileList.findIndex(
      (f) => f.absolute_path === viewingFile.absolute_path
    )
    const prevFile = currentIndex > 0 ? flattenedFileList[currentIndex - 1] : undefined
    if (prevFile) {
      handleFileSelect(prevFile)
    }
  }, [flattenedFileList, viewingFile, handleFileSelect])

  // Navigation state helpers
  const hasNext = useMemo(() => {
    if (!viewingFile) return false
    const currentIndex = flattenedFileList.findIndex(
      (f) => f.absolute_path === viewingFile.absolute_path
    )
    return currentIndex >= 0 && currentIndex < flattenedFileList.length - 1
  }, [flattenedFileList, viewingFile])

  const hasPrevious = useMemo(() => {
    if (!viewingFile) return false
    const currentIndex = flattenedFileList.findIndex(
      (f) => f.absolute_path === viewingFile.absolute_path
    )
    return currentIndex > 0
  }, [flattenedFileList, viewingFile])

  return {
    viewingFile,
    lastSelectedFile,
    selectedNoteId,
    setSelectedNoteId,
    flattenedFileList,
    handleFileSelect,
    handleFileClose,
    handleFileOpen,
    handleNextFile,
    handlePreviousFile,
    hasNext,
    hasPrevious,
  }
}

