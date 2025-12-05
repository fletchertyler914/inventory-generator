import type { InventoryItem } from "@/types/inventory"

/**
 * Folder tree node structure
 */
export interface FolderNode {
  name: string
  path: string
  files: InventoryItem[]
  subfolders: Map<string, FolderNode>
}

/**
 * WeakMap cache for folder tree computations
 * This allows garbage collection when items array is no longer referenced
 */
const treeCache = new WeakMap<InventoryItem[], FolderNode>()

/**
 * ELITE: Build folder tree structure from inventory items
 * 
 * Uses WeakMap caching for performance - tree is only recomputed when items array changes
 * 
 * @param items - Array of inventory items
 * @returns Root folder node with nested structure
 */
export function buildFolderTree(items: InventoryItem[]): FolderNode {
  // Check cache first
  if (treeCache.has(items)) {
    return treeCache.get(items)!
  }

  const root: FolderNode = {
    name: "",
    path: "",
    files: [],
    subfolders: new Map(),
  }

  items.forEach((item) => {
    // Handle empty or root folder paths
    const folderPath = item.folder_path || ""

    // Parse folder path into segments
    const pathParts = folderPath.split("/").filter((p) => p.trim())

    // If no folder path, add file to root
    if (pathParts.length === 0) {
      root.files.push(item)
      return
    }

    let current = root

    // Navigate/create folder structure
    pathParts.forEach((part, index) => {
      if (!current.subfolders.has(part)) {
        const fullPath = pathParts.slice(0, index + 1).join("/")
        current.subfolders.set(part, {
          name: part,
          path: fullPath,
          files: [],
          subfolders: new Map(),
        })
      }
      current = current.subfolders.get(part)!
    })

    // Add file to current folder
    current.files.push(item)
  })

  // Cache the result
  treeCache.set(items, root)

  return root
}

/**
 * ELITE: Flatten folder tree in display order
 * 
 * Flattens tree in the same order as FileNavigator renders:
 * - Folders first (sorted alphabetically)
 * - Files within each folder (sorted alphabetically)
 * 
 * @param tree - Root folder node
 * @returns Flattened array of inventory items in display order
 */
export function flattenFileTree(tree: FolderNode): InventoryItem[] {
  const flattened: InventoryItem[] = []

  const flattenNode = (node: FolderNode) => {
    // Sort and process subfolders first (alphabetically)
    const sortedSubfolders = Array.from(node.subfolders.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    sortedSubfolders.forEach((subfolder) => {
      flattenNode(subfolder)
    })

    // Then add files in this folder (sorted alphabetically)
    const sortedFiles = node.files.sort((a, b) => a.file_name.localeCompare(b.file_name))

    flattened.push(...sortedFiles)
  }

  flattenNode(tree)
  return flattened
}

/**
 * Convenience function: Build tree and flatten in one call
 * 
 * @param items - Array of inventory items
 * @returns Flattened array of inventory items in display order
 */
export function getFlattenedFileList(items: InventoryItem[]): InventoryItem[] {
  const tree = buildFolderTree(items)
  return flattenFileTree(tree)
}

