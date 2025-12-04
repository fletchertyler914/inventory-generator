/**
 * Service layer for inventory-related Tauri command invocations
 * Abstracts backend communication for easier testing and maintenance
 * 
 * All functions in this module are async and return Promises that resolve
 * with the expected data type or reject with an error.
 */

import { invoke } from "@tauri-apps/api/core"
import type { InventoryItem } from "@/types/inventory"

/**
 * Counts files in a directory without loading metadata (fast)
 * 
 * @param path - Absolute path to the directory to count
 * @returns Promise resolving to the number of files
 * @throws Error if the path doesn't exist or isn't a directory
 * 
 * @example
 * ```ts
 * const count = await countDirectoryFiles("/path/to/documents")
 * // Use count for display or validation
 * ```
 */
export async function countDirectoryFiles(path: string): Promise<number> {
  return invoke<number>("count_directory_files", { path })
}

/**
 * Scans a directory and returns inventory items
 * 
 * @param path - Absolute path to the directory to scan
 * @returns Promise resolving to an array of InventoryItem objects
 * @throws Error if the path doesn't exist or isn't a directory
 * 
 * @example
 * ```ts
 * const items = await scanDirectory("/path/to/documents")
 * // Process items array
 * ```
 */
export async function scanDirectory(path: string): Promise<InventoryItem[]> {
  return invoke<InventoryItem[]>("scan_directory", { path })
}

/**
 * Exports inventory to a file
 * 
 * @param items - Array of inventory items to export
 * @param format - Export format: "xlsx", "csv", or "json"
 * @param outputPath - Full path where the file should be saved
 * @param caseNumber - Optional case number to include in metadata
 * @param folderPath - Optional folder path to include in metadata
 * @returns Promise that resolves when export is complete
 * @throws Error if export fails
 * 
 * @example
 * ```ts
 * await exportInventory(items, "xlsx", "/path/to/output.xlsx", "CASE-001", "/source/folder")
 * ```
 */
export async function exportInventory(
  items: InventoryItem[],
  format: "xlsx" | "csv" | "json",
  outputPath: string,
  caseNumber: string | null,
  folderPath: string | null,
  columnConfig?: { columns: Array<{ id: string; label: string; visible: boolean; order: number; fieldPath?: string }> } | null
): Promise<void> {
  return invoke("export_inventory", {
    items,
    format,
    outputPath,
    caseNumber: caseNumber || null,
    folderPath: folderPath || null,
    columnConfig: columnConfig ? JSON.stringify(columnConfig) : null,
  })
}

/**
 * Syncs inventory with folder contents
 * 
 * Preserves user edits to existing items and adds new files.
 * Removes items for files that no longer exist.
 * 
 * @param folderPath - Path to the folder to sync with
 * @param existingItems - Current inventory items (with user edits)
 * @returns Promise resolving to updated array of InventoryItem objects
 * @throws Error if folder doesn't exist or sync fails
 * 
 * @example
 * ```ts
 * const syncedItems = await syncInventory("/path/to/folder", currentItems)
 * setItems(syncedItems)
 * ```
 */
export async function syncInventory(
  folderPath: string,
  existingItems: InventoryItem[]
): Promise<InventoryItem[]> {
  return invoke<InventoryItem[]>("sync_inventory", {
    folderPath,
    existingItems,
  })
}

