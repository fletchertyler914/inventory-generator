/**
 * Column configuration system for customizable tables
 * Allows non-technical users to customize table columns easily
 * ELITE: Uses tauri-plugin-store for secure persistence
 */

import { getStoreValue, setStoreValue } from "@/lib/store-utils"

export type ColumnId = 
  | 'date_rcvd'
  | 'doc_year'
  | 'doc_date_range'
  | 'document_type'
  | 'document_description'
  | 'file_name'
  | 'folder_name'
  | 'folder_path'
  | 'file_type'
  | 'file_extension'
  | 'bates_stamp'
  | 'status'
  | 'tags'
  | 'notes'
  | 'file_size'
  | 'created_at'
  | 'modified_at'
  | 'parent_folder'
  | 'folder_depth'
  | 'file_path_segments'
  | 'file_hash'
  | 'mime_type'
  | 'content_type'
  | string // Allow custom columns

export interface TableColumn {
  id: ColumnId
  label: string
  visible: boolean
  width?: number
  order: number
  pinned?: boolean // Pin to left side
  custom?: boolean // Is this a custom column?
  fieldPath?: string // For custom columns: path to data (e.g., "metadata.custom_field")
  renderer?: 'text' | 'date' | 'number' | 'badge' | 'status' | 'tags' | 'editable' | 'custom'
}

export interface TableColumnConfig {
  columns: TableColumn[]
  version: number
}

/**
 * Default column definitions
 * ELITE: Comprehensive defaults covering file system basics, path-based, and content-based fields
 */
export const DEFAULT_COLUMNS: TableColumn[] = [
  // Document-specific fields (legacy support)
  { id: 'date_rcvd', label: 'Date Rcvd', visible: true, order: 0, renderer: 'editable' },
  { id: 'doc_year', label: 'Doc Year', visible: true, order: 1, renderer: 'number' },
  { id: 'doc_date_range', label: 'Doc Date Range', visible: true, order: 2, renderer: 'text' },
  { id: 'document_type', label: 'Document Type', visible: true, order: 3, renderer: 'text' },
  { id: 'document_description', label: 'Document Description', visible: true, order: 4, renderer: 'text' },
  { id: 'bates_stamp', label: 'Bates Stamp', visible: true, order: 10, renderer: 'editable' },
  
  // File system basics
  { id: 'file_name', label: 'File Name', visible: true, order: 5, renderer: 'text' },
  { id: 'file_type', label: 'File Type', visible: true, order: 8, renderer: 'badge' },
  { id: 'file_extension', label: 'File Extension', visible: false, order: 9, renderer: 'badge' },
  { id: 'file_size', label: 'File Size', visible: false, order: 16, renderer: 'number' },
  { id: 'created_at', label: 'Created', visible: false, order: 17, renderer: 'date' },
  { id: 'modified_at', label: 'Modified', visible: false, order: 18, renderer: 'date' },
  
  // Path-based fields
  { id: 'folder_name', label: 'Folder Name', visible: true, order: 6, renderer: 'text' },
  { id: 'folder_path', label: 'Folder Path', visible: false, order: 7, renderer: 'text' },
  { id: 'parent_folder', label: 'Parent Folder', visible: false, order: 19, renderer: 'text' },
  { id: 'folder_depth', label: 'Folder Depth', visible: false, order: 20, renderer: 'number' },
  { id: 'file_path_segments', label: 'Path Segments', visible: false, order: 21, renderer: 'text' },
  
  // Content-based fields
  { id: 'file_hash', label: 'File Hash', visible: false, order: 22, renderer: 'text' },
  { id: 'mime_type', label: 'MIME Type', visible: false, order: 23, renderer: 'text' },
  { id: 'content_type', label: 'Content Type', visible: false, order: 24, renderer: 'text' },
  
  // User fields
  { id: 'status', label: 'Status', visible: true, order: 11, renderer: 'status' },
  { id: 'tags', label: 'Tags', visible: true, order: 12, renderer: 'tags' },
  { id: 'notes', label: 'Notes', visible: false, order: 13, renderer: 'text' },
]

/**
 * Get global default column configuration
 * ELITE: Cached global config for performance
 * Note: This is async now due to Tauri store, but we provide sync fallback
 */
let globalConfigCache: TableColumnConfig | null = null

export function getGlobalColumnConfig(): TableColumnConfig {
  if (typeof window === 'undefined') {
    return { columns: DEFAULT_COLUMNS, version: 1 }
  }

  if (globalConfigCache) {
    return globalConfigCache
  }

  // Fallback to localStorage for synchronous access (will be migrated on next load)
  const stored = localStorage.getItem('table_columns_global')
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as TableColumnConfig
      const merged = mergeWithDefaults(parsed.columns)
      globalConfigCache = { columns: merged, version: parsed.version || 1 }
      return globalConfigCache
    } catch {
      // Invalid stored data, use defaults
    }
  }

  globalConfigCache = { columns: DEFAULT_COLUMNS, version: 1 }
  return globalConfigCache
}

/**
 * Async version that loads from Tauri store
 */
export async function getGlobalColumnConfigAsync(): Promise<TableColumnConfig> {
  if (globalConfigCache) {
    return globalConfigCache
  }

  const stored = await getStoreValue<TableColumnConfig>('table_columns_global', { columns: DEFAULT_COLUMNS, version: 1 }, 'app')
  
  if (stored && stored.columns) {
    const merged = mergeWithDefaults(stored.columns)
    globalConfigCache = { columns: merged, version: stored.version || 1 }
    return globalConfigCache
  }

  globalConfigCache = { columns: DEFAULT_COLUMNS, version: 1 }
  return globalConfigCache
}

/**
 * Get column configuration from store or return defaults
 * ELITE: Supports global defaults with case-specific overrides
 * Note: Sync version for backward compatibility, async version available
 */
export function getColumnConfig(caseId?: string): TableColumnConfig {
  if (typeof window === 'undefined') {
    return { columns: DEFAULT_COLUMNS, version: 1 }
  }

  // Get global defaults first
  const globalConfig = getGlobalColumnConfig()
  
  // If no case ID, return global config
  if (!caseId) {
    return globalConfig
  }

  // Get case-specific overrides (fallback to localStorage for sync access)
  const caseKey = `table_columns_${caseId}`
  const stored = localStorage.getItem(caseKey)
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as TableColumnConfig
      // Merge case-specific with global defaults
      const merged = mergeWithCaseOverrides(globalConfig.columns, parsed.columns)
      return { columns: merged, version: parsed.version || 1 }
    } catch {
      // Invalid stored data, use global defaults
    }
  }

  // No case-specific config, return global defaults
  return globalConfig
}

/**
 * Async version that loads from Tauri store
 */
export async function getColumnConfigAsync(caseId?: string): Promise<TableColumnConfig> {
  // Get global defaults first
  const globalConfig = await getGlobalColumnConfigAsync()
  
  // If no case ID, return global config
  if (!caseId) {
    return globalConfig
  }

  // Get case-specific overrides
  const caseKey = `table_columns_${caseId}`
  const stored = await getStoreValue<TableColumnConfig>(caseKey, globalConfig, 'app')
  
  if (stored && stored.columns) {
    // Merge case-specific with global defaults
    const merged = mergeWithCaseOverrides(globalConfig.columns, stored.columns)
    return { columns: merged, version: stored.version || 1 }
  }

  // No case-specific config, return global defaults
  return globalConfig
}

/**
 * Save global column configuration
 * ELITE: Invalidates cache on save for consistency
 */
export async function saveGlobalColumnConfig(config: TableColumnConfig): Promise<void> {
  if (typeof window === 'undefined') return

  globalConfigCache = config
  await setStoreValue('table_columns_global', config, 'app')
  // Also save to localStorage for backward compatibility during migration
  localStorage.setItem('table_columns_global', JSON.stringify(config))
}

/**
 * Save column configuration to store
 * ELITE: Supports global and case-specific saves
 */
export async function saveColumnConfig(config: TableColumnConfig, caseId?: string): Promise<void> {
  if (typeof window === 'undefined') return

  if (caseId) {
    // Case-specific override
    const key = `table_columns_${caseId}`
    await setStoreValue(key, config, 'app')
    // Also save to localStorage for backward compatibility
    localStorage.setItem(key, JSON.stringify(config))
  } else {
    // Global default
    await saveGlobalColumnConfig(config)
  }
}

/**
 * Merge stored columns with defaults to ensure new columns are available
 * ELITE: Efficient Map-based merging for O(n) performance
 */
function mergeWithDefaults(stored: TableColumn[]): TableColumn[] {
  const storedMap = new Map(stored.map(col => [col.id, col]))
  const merged: TableColumn[] = []

  // Add all defaults first
  for (const defaultCol of DEFAULT_COLUMNS) {
    const storedCol = storedMap.get(defaultCol.id)
    if (storedCol) {
      // Use stored settings but keep default properties
      merged.push({
        ...defaultCol,
        ...storedCol,
        custom: false, // Ensure defaults aren't marked as custom
      })
      storedMap.delete(defaultCol.id)
    } else {
      merged.push(defaultCol)
    }
  }

  // Add any custom columns that aren't in defaults
  for (const customCol of stored) {
    if (customCol.custom && !DEFAULT_COLUMNS.find(d => d.id === customCol.id)) {
      merged.push(customCol)
    }
  }

  // Sort by order
  merged.sort((a, b) => a.order - b.order)

  return merged
}

/**
 * Merge case-specific columns with global defaults
 * ELITE: Case overrides take precedence, but new global defaults are still added
 */
function mergeWithCaseOverrides(globalColumns: TableColumn[], caseColumns: TableColumn[]): TableColumn[] {
  const globalMap = new Map(globalColumns.map(col => [col.id, col]))
  const caseMap = new Map(caseColumns.map(col => [col.id, col]))
  const merged: TableColumn[] = []

  // Start with all global defaults
  for (const globalCol of globalColumns) {
    const caseCol = caseMap.get(globalCol.id)
    if (caseCol) {
      // Case-specific override exists - use it but preserve default properties
      merged.push({
        ...globalCol,
        ...caseCol,
        ...(globalCol.custom !== undefined && { custom: globalCol.custom }), // Preserve custom flag from global
      })
      caseMap.delete(globalCol.id)
    } else {
      // No case override, use global default
      merged.push(globalCol)
    }
  }

  // Add any case-specific custom columns that aren't in global defaults
  for (const caseCol of caseColumns) {
    if (!globalMap.has(caseCol.id)) {
      merged.push(caseCol)
    }
  }

  // Sort by order
  merged.sort((a, b) => a.order - b.order)

  return merged
}


