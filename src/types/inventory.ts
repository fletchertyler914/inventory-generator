/**
 * Type definitions for inventory items and related data structures
 */

/**
 * File review status
 */
export type FileStatus = 'unreviewed' | 'in_progress' | 'reviewed' | 'flagged' | 'finalized'

/**
 * Represents a single inventory item with schema-driven structure
 * Core fields are required, all other fields come from inventory_data JSON
 * ELITE: Flexible structure based on global/case schema configuration
 */
export interface InventoryItem {
  // Core required fields
  id?: string // File ID from database (UUID) - cloud-ready identifier
  absolute_path: string
  status?: FileStatus
  tags?: string[]
  
  // File system fields (always available, computed from file metadata)
  file_name: string
  folder_name: string
  folder_path: string
  file_type: string
  
  // Schema-driven fields stored in inventory_data JSON
  // All other fields are accessed via inventory_data using column field paths
  inventory_data?: string // JSON string containing all schema-defined fields
}

/**
 * Utility type for partial updates to inventory items
 */
export type InventoryItemUpdate = Partial<InventoryItem>

/**
 * Type-safe field names for inventory items
 * ELITE: Core fields + schema-driven fields from inventory_data
 */
export type InventoryItemField = 
  | 'id'
  | 'absolute_path'
  | 'status'
  | 'tags'
  | 'file_name'
  | 'folder_name'
  | 'folder_path'
  | 'file_type'
  | 'inventory_data'
  | string // Allow schema-defined fields

/**
 * Type guard to check if a string is a valid core inventory item field
 * ELITE: Schema fields are validated dynamically via column config
 */
export function isInventoryItemField(field: string): boolean {
  const coreFields = [
    "id",
    "absolute_path",
    "status",
    "tags",
    "file_name",
    "folder_name",
    "folder_path",
    "file_type",
    "inventory_data",
  ]
  return coreFields.includes(field) || field.startsWith('inventory_data.')
}

/**
 * Type-safe update function for inventory items
 * ELITE: Handles both core fields and schema-driven fields in inventory_data
 */
export function updateInventoryItemField(
  item: InventoryItem,
  field: InventoryItemField,
  value: string | number | FileStatus | string[]
): InventoryItem {
  // Handle core fields directly
  if (field === "status") {
    return { ...item, status: value as FileStatus }
  }
  
  if (field === "tags") {
    return { ...item, tags: value as string[] }
  }
  
  if (field === "id" || field === "absolute_path" || field === "file_name" || 
      field === "folder_name" || field === "folder_path" || field === "file_type") {
    return { ...item, [field]: String(value) }
  }
  
  // Handle schema-driven fields in inventory_data
  if (field.startsWith('inventory_data.') || field !== 'inventory_data') {
    try {
      const inventoryData = item.inventory_data ? JSON.parse(item.inventory_data) : {}
      const fieldPath = field.startsWith('inventory_data.') ? field.substring('inventory_data.'.length) : field
      
      // Update the field in inventory_data
      inventoryData[fieldPath] = value
      
      return {
        ...item,
        inventory_data: JSON.stringify(inventoryData)
      }
    } catch {
      // If parsing fails, create new inventory_data
      const fieldPath = field.startsWith('inventory_data.') ? field.substring('inventory_data.'.length) : field
      return {
        ...item,
        inventory_data: JSON.stringify({ [fieldPath]: value })
      }
    }
  }
  
  return item
}
