/**
 * Type definitions for inventory items and related data structures
 */

/**
 * File review status
 */
export type FileStatus = 'unreviewed' | 'in_progress' | 'reviewed' | 'flagged' | 'finalized'

/**
 * Represents a single inventory item with all document metadata
 */
export interface InventoryItem {
  id?: string // File ID from database (UUID) - cloud-ready identifier
  date_rcvd: string
  doc_year: number
  doc_date_range: string
  document_type: string
  document_description: string
  file_name: string
  folder_name: string
  folder_path: string
  file_type: string
  bates_stamp: string
  notes: string
  absolute_path: string
  status?: FileStatus
  tags?: string[]
}

/**
 * Utility type for partial updates to inventory items
 */
export type InventoryItemUpdate = Partial<InventoryItem>

/**
 * Type-safe field names for inventory items
 */
export type InventoryItemField = keyof InventoryItem

/**
 * Type guard to check if a string is a valid inventory item field
 */
export function isInventoryItemField(field: string): field is InventoryItemField {
  return [
    "id",
    "date_rcvd",
    "doc_year",
    "doc_date_range",
    "document_type",
    "document_description",
    "file_name",
    "folder_name",
    "folder_path",
    "file_type",
    "bates_stamp",
    "notes",
    "absolute_path",
    "status",
    "tags",
  ].includes(field)
}

/**
 * Type-safe update function for inventory items
 */
export function updateInventoryItemField(
  item: InventoryItem,
  field: InventoryItemField,
  value: string | number | FileStatus | string[]
): InventoryItem {
  if (field === "doc_year") {
    return { ...item, doc_year: typeof value === "number" ? value : parseInt(String(value)) || item.doc_year }
  }
  
  if (field === "status") {
    return { ...item, status: value as FileStatus }
  }
  
  if (field === "tags") {
    return { ...item, tags: value as string[] }
  }
  
  return { ...item, [field]: String(value) }
}
