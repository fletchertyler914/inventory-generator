/**
 * ELITE: Optimized filter utility for swimlane filtering
 * 
 * Performance optimizations:
 * - Uses WeakMap caching from getParsedInventoryData
 * - Early termination on first match
 * - Optimized string operations
 * - Handles empty queries efficiently
 * - Recursively searches nested inventory_data fields
 */

import type { InventoryItem } from '@/types/inventory'
import { getParsedInventoryData } from './inventory-utils'

/**
 * Recursively search a value for the query string
 * Handles strings, numbers, arrays, and nested objects
 */
function searchValue(value: any, query: string): boolean {
  if (value === null || value === undefined) {
    return false
  }

  // String or number - convert to string and search
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).toLowerCase().includes(query)
  }

  // Boolean - convert to string representation
  if (typeof value === 'boolean') {
    return (value ? 'yes' : 'no').includes(query)
  }

  // Array - search each element
  if (Array.isArray(value)) {
    for (const item of value) {
      if (searchValue(item, query)) {
        return true // Early termination
      }
    }
    return false
  }

  // Object - recursively search all values
  if (typeof value === 'object') {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        if (searchValue(value[key], query)) {
          return true // Early termination
        }
      }
    }
    return false
  }

  return false
}

/**
 * ELITE: Filter swimlane items by query string
 * 
 * Searches across:
 * - file_name (case-insensitive)
 * - folder_path (case-insensitive)
 * - tags array (case-insensitive)
 * - All inventory_data fields (recursively, case-insensitive)
 * 
 * Performance optimizations:
 * - Empty query returns all items without processing
 * - Early termination on first match
 * - Leverages WeakMap caching from getParsedInventoryData
 * - Optimized string operations (toLowerCase called once per item)
 * 
 * @param items - Array of inventory items to filter
 * @param query - Search query string (case-insensitive)
 * @returns Filtered array of items matching the query
 */
export function filterSwimlaneItems(
  items: InventoryItem[],
  query: string
): InventoryItem[] {
  // ELITE: Empty query handling - skip all processing
  if (!query || !query.trim()) {
    return items
  }

  // ELITE: Normalize query once for all comparisons
  const normalizedQuery = query.trim().toLowerCase()

  // ELITE: Filter with early termination
  return items.filter((item) => {
    // Search file_name
    if (item.file_name?.toLowerCase().includes(normalizedQuery)) {
      return true
    }

    // Search folder_path
    if (item.folder_path?.toLowerCase().includes(normalizedQuery)) {
      return true
    }

    // Search tags array
    if (item.tags && item.tags.length > 0) {
      for (const tag of item.tags) {
        if (tag.toLowerCase().includes(normalizedQuery)) {
          return true // Early termination
        }
      }
    }

    // ELITE: Search inventory_data fields (leverages WeakMap caching)
    const inventoryData = getParsedInventoryData(item)
    if (Object.keys(inventoryData).length > 0) {
      if (searchValue(inventoryData, normalizedQuery)) {
        return true // Early termination
      }
    }

    return false
  })
}

