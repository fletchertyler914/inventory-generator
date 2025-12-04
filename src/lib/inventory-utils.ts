/**
 * Utility functions for working with inventory_data and mappings
 * ELITE: Helper functions to parse and access schema-driven fields
 */

import type { InventoryItem } from '@/types/inventory'
import { getMappings } from '@/services/mappingService'
import type { FieldMapping } from '@/types/mapping'

/**
 * Parse inventory_data JSON string into object
 * Uses caching for performance
 */
const jsonCache = new WeakMap<InventoryItem, Record<string, any>>()

export function getParsedInventoryData(item: InventoryItem): Record<string, any> {
  if (!jsonCache.has(item)) {
    try {
      const parsed = item.inventory_data 
        ? JSON.parse(item.inventory_data) 
        : {}
      jsonCache.set(item, parsed)
    } catch {
      jsonCache.set(item, {})
    }
  }
  return jsonCache.get(item) || {}
}

/**
 * Get a specific field value from inventory_data
 */
export function getInventoryField(
  item: InventoryItem, 
  fieldName: string
): string | number | boolean | null | undefined {
  const data = getParsedInventoryData(item)
  return data[fieldName]
}

/**
 * Get all mapping field values for an item
 * Returns a map of columnId -> value
 */
export function getMappingFields(
  item: InventoryItem,
  caseId?: string
): Map<string, { value: any; mapping: FieldMapping }> {
  const mappings = getMappings(caseId)
  const data = getParsedInventoryData(item)
  const fields = new Map<string, { value: any; mapping: FieldMapping }>()
  
  for (const mapping of mappings) {
    const value = data[mapping.columnId]
    if (value !== undefined && value !== null && value !== '') {
      fields.set(mapping.columnId, { value, mapping })
    }
  }
  
  return fields
}

/**
 * Get key mapping fields to display on cards
 * Returns top priority mappings with non-empty values
 */
export function getKeyMappingFields(
  item: InventoryItem,
  caseId?: string,
  maxFields: number = 2
): Array<{ columnId: string; label: string; value: any }> {
  const mappings = getMappings(caseId)
  const data = getParsedInventoryData(item)
  
  // Sort by priority and get fields with values
  const fieldsWithValues = mappings
    .filter(m => {
      const value = data[m.columnId]
      return value !== undefined && value !== null && value !== ''
    })
    .sort((a, b) => (a.priority || 999) - (b.priority || 999))
    .slice(0, maxFields)
    .map(m => ({
      columnId: m.columnId,
      label: m.description || m.columnId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: data[m.columnId],
    }))
  
  return fieldsWithValues
}

/**
 * Format a mapping field value for display
 */
export function formatMappingValue(
  value: any,
  extractionMethod?: string
): string {
  if (value === null || value === undefined) return ''
  
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  
  return String(value)
}

