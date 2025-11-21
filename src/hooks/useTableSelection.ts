import { useState, useCallback } from "react"

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
    if (selectedRows.size === totalItems) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(Array.from({ length: totalItems }, (_, i) => i)))
    }
  }, [selectedRows.size, totalItems])

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set())
  }, [])

  const isAllSelected = selectedRows.size === totalItems && totalItems > 0
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < totalItems

  return {
    selectedRows,
    toggleRow,
    toggleAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    selectedCount: selectedRows.size,
  }
}

