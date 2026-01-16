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

