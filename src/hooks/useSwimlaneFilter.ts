/**
 * ELITE: Optimized hook for swimlane filtering
 * 
 * Features:
 * - Independent filter state per swimlane
 * - Debounced filter queries (300ms, matches useSearch pattern)
 * - Memoized filtered results per swimlane
 * - Toggle handlers with useCallback
 * - Follows same pattern as useFileNoteCounts and useSearch hooks
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { filterSwimlaneItems } from '@/lib/swimlane-filter-utils'
import type { InventoryItem, FileStatus } from '@/types/inventory'

export interface UseSwimlaneFilterOptions {
  items: InventoryItem[]
  debounceMs?: number
}

export interface UseSwimlaneFilterReturn {
  // Filter queries per swimlane
  filterQueries: Map<FileStatus, string>
  // Filter visibility per swimlane
  filterVisible: Map<FileStatus, boolean>
  // Debounced filter queries per swimlane
  debouncedQueries: Map<FileStatus, string>
  // Filtered items per swimlane
  filteredItems: Map<FileStatus, InventoryItem[]>
  // Set filter query for a swimlane
  setFilterQuery: (status: FileStatus, query: string) => void
  // Toggle filter visibility for a swimlane
  toggleFilter: (status: FileStatus) => void
  // Clear filter for a swimlane
  clearFilter: (status: FileStatus) => void
}

/**
 * ELITE: Hook for managing independent filter state per swimlane
 */
export function useSwimlaneFilter({
  items,
  debounceMs = 300,
}: UseSwimlaneFilterOptions): UseSwimlaneFilterReturn {
  // ELITE: Filter queries per swimlane
  const [filterQueries, setFilterQueries] = useState<Map<FileStatus, string>>(
    new Map()
  )

  // ELITE: Debounced filter queries per swimlane
  const [debouncedQueries, setDebouncedQueries] = useState<
    Map<FileStatus, string>
  >(new Map())

  // ELITE: Filter visibility per swimlane
  const [filterVisible, setFilterVisible] = useState<Map<FileStatus, boolean>>(
    new Map()
  )

  // ELITE: Debounce filter queries per swimlane
  useEffect(() => {
    const timeoutIds = new Map<FileStatus, NodeJS.Timeout>()

    filterQueries.forEach((query, status) => {
      const timeoutId = setTimeout(() => {
        setDebouncedQueries((prev) => {
          const next = new Map(prev)
          next.set(status, query)
          return next
        })
      }, debounceMs)

      timeoutIds.set(status, timeoutId)
    })

    return () => {
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId))
    }
  }, [filterQueries, debounceMs])

  // ELITE: Memoized filtered items per swimlane
  const filteredItems = useMemo(() => {
    const filtered = new Map<FileStatus, InventoryItem[]>()
    const statuses: FileStatus[] = [
      'unreviewed',
      'in_progress',
      'reviewed',
      'flagged',
      'finalized',
    ]

    for (const status of statuses) {
      // Get items for this status
      const statusItems = items.filter(
        (item) => (item.status || 'unreviewed') === status
      )

      // Get debounced query for this status
      const query = debouncedQueries.get(status) || ''

      // Filter items if query exists
      if (query.trim()) {
        filtered.set(status, filterSwimlaneItems(statusItems, query))
      } else {
        filtered.set(status, statusItems)
      }
    }

    return filtered
  }, [items, debouncedQueries])

  // ELITE: Set filter query with useCallback
  const setFilterQuery = useCallback((status: FileStatus, query: string) => {
    setFilterQueries((prev) => {
      const next = new Map(prev)
      next.set(status, query)
      return next
    })
  }, [])

  // ELITE: Toggle filter visibility with useCallback
  const toggleFilter = useCallback((status: FileStatus) => {
    setFilterVisible((prev) => {
      const next = new Map(prev)
      const current = next.get(status) || false
      next.set(status, !current)

      // Clear filter query when closing
      if (current) {
        setFilterQueries((prevQueries) => {
          const nextQueries = new Map(prevQueries)
          nextQueries.set(status, '')
          return nextQueries
        })
      }

      return next
    })
  }, [])

  // ELITE: Clear filter with useCallback
  const clearFilter = useCallback((status: FileStatus) => {
    setFilterQueries((prev) => {
      const next = new Map(prev)
      next.set(status, '')
      return next
    })
  }, [])

  return {
    filterQueries,
    filterVisible,
    debouncedQueries,
    filteredItems,
    setFilterQuery,
    toggleFilter,
    clearFilter,
  }
}

