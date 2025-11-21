import { useState, useCallback, useMemo } from "react"

export function useTableSelection(totalItems: number) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const toggleRow = useCallback((index: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedRows((prev) => {
      if (prev.size === totalItems) {
        return new Set()
      } else {
        return new Set(Array.from({ length: totalItems }, (_, i) => i))
      }
    })
  }, [totalItems])

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set())
  }, [])

  // Memoize computed values
  const isAllSelected = useMemo(
    () => selectedRows.size === totalItems && totalItems > 0,
    [selectedRows.size, totalItems]
  )
  
  const isIndeterminate = useMemo(
    () => selectedRows.size > 0 && selectedRows.size < totalItems,
    [selectedRows.size, totalItems]
  )
  
  const selectedCount = useMemo(() => selectedRows.size, [selectedRows.size])

  return {
    selectedRows,
    setSelectedRows,
    toggleRow,
    toggleAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    selectedCount,
  }
}

