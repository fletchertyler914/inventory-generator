import { useState, useCallback, useMemo, useRef } from "react"

/**
 * ELITE: Optimized workflow selection hook with performance optimizations
 * 
 * Features:
 * - O(1) selection lookups using Set<number>
 * - Memoized handlers to prevent re-renders
 * - Efficient range selection (O(n) single pass)
 * - Standard selection patterns (Cmd/Ctrl+Click, Shift+Click)
 * - Tracks last selected index for range selection
 */
export interface UseWorkflowSelectionOptions {
  selectedIndices?: number[]
  onSelectionChange?: (selectedIndices: number[]) => void
  totalItems: number
}

export interface UseWorkflowSelectionReturn {
  selectedSet: Set<number>
  isSelected: (index: number) => boolean
  handleSelect: (index: number, event: React.MouseEvent) => void
  lastSelectedIndex: number | null
  selectedCount: number
}

export function useWorkflowSelection({
  selectedIndices = [],
  onSelectionChange,
  totalItems,
}: UseWorkflowSelectionOptions): UseWorkflowSelectionReturn {
  // Use Set for O(1) lookups instead of array includes
  const selectedSet = useMemo(() => {
    const set = new Set<number>()
    selectedIndices.forEach((idx) => {
      if (idx >= 0 && idx < totalItems) {
        set.add(idx)
      }
    })
    return set
  }, [selectedIndices, totalItems])

  // Track last selected index for range selection
  const lastSelectedIndexRef = useRef<number | null>(null)

  // Memoized selection handler with modifier key detection
  const handleSelect = useCallback(
    (index: number, event: React.MouseEvent) => {
      if (index < 0 || index >= totalItems) return

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const modifierKey = isMac ? event.metaKey : event.ctrlKey
      const shiftKey = event.shiftKey

      let newSelection: number[]

      if (shiftKey && lastSelectedIndexRef.current !== null) {
        // Shift+Click: Range selection (replace selection with range)
        const lastIndex = lastSelectedIndexRef.current
        const start = Math.min(lastIndex, index)
        const end = Math.max(lastIndex, index)

        // O(n) single pass range selection
        const range: number[] = []
        for (let i = start; i <= end; i++) {
          range.push(i)
        }
        newSelection = range
      } else if (modifierKey && shiftKey && lastSelectedIndexRef.current !== null) {
        // Cmd/Ctrl+Shift+Click: Add range to existing selection
        const lastIndex = lastSelectedIndexRef.current
        const start = Math.min(lastIndex, index)
        const end = Math.max(lastIndex, index)

        // O(n) single pass range selection
        const range: number[] = []
        for (let i = start; i <= end; i++) {
          range.push(i)
        }

        // Merge with existing selection
        const existing = new Set(selectedIndices)
        range.forEach((idx) => existing.add(idx))
        newSelection = Array.from(existing)
      } else if (modifierKey) {
        // Cmd/Ctrl+Click: Toggle selection (add/remove from selection)
        const newSet = new Set(selectedIndices)
        if (newSet.has(index)) {
          newSet.delete(index)
        } else {
          newSet.add(index)
        }
        newSelection = Array.from(newSet)
      } else {
        // Single click: clear others and select this one
        newSelection = [index]
      }

      // Update last selected index (always update for range selection to work)
      lastSelectedIndexRef.current = index

      // Notify parent of selection change
      onSelectionChange?.(newSelection)
    },
    [selectedIndices, totalItems, onSelectionChange]
  )

  // O(1) lookup function
  const isSelected = useCallback(
    (index: number) => {
      return selectedSet.has(index)
    },
    [selectedSet]
  )

  const selectedCount = selectedSet.size
  const lastSelectedIndex = lastSelectedIndexRef.current

  return {
    selectedSet,
    isSelected,
    handleSelect,
    lastSelectedIndex,
    selectedCount,
  }
}

