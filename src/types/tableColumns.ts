/**
 * Column configuration system for customizable tables
 * Allows non-technical users to customize table columns easily
 * ELITE: Schema-driven - columns are derived from mapping configuration
 * The schema defines the inventory shape, so columns reflect available schema fields
 */

import { getStoreValue, setStoreValue } from "@/lib/store-utils"
import type { MappingConfig } from "@/types/mapping"

export type ColumnId = 
  | 'file_name'
  | 'file_type'
  | 'file_extension'
  | 'file_size'
  | 'folder_name'
  | 'folder_path'
  | 'parent_folder'
  | 'folder_depth'
  | 'file_path_segments'
  | 'created_at'
  | 'modified_at'
  | 'file_hash'
  | 'mime_type'
  | 'content_type'
  | 'status'
  | 'tags'
  | 'date_received' // Common column (optional)
  | 'bates_stamp' // Common column (optional)
  | 'notes' // Common column (optional)
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
 * ELITE: Generic defaults for core workflow - clean and scannable
 * Only essential file system fields visible by default
 */
export const DEFAULT_COLUMNS: TableColumn[] = [
  // File system basics (visible by default)
  { id: 'file_name', label: 'File Name', visible: true, order: 0, renderer: 'text' },
  { id: 'file_type', label: 'File Type', visible: true, order: 1, renderer: 'badge' },
  { id: 'folder_name', label: 'Folder Name', visible: true, order: 2, renderer: 'text' },
  { id: 'status', label: 'Status', visible: true, order: 3, renderer: 'status' },
  { id: 'tags', label: 'Tags', visible: true, order: 4, renderer: 'tags' },
  
  // File system details (hidden by default, available)
  { id: 'file_extension', label: 'File Extension', visible: false, order: 5, renderer: 'badge' },
  { id: 'file_size', label: 'File Size', visible: false, order: 6, renderer: 'number' },
  { id: 'folder_path', label: 'Folder Path', visible: false, order: 7, renderer: 'text' },
  { id: 'created_at', label: 'Created', visible: false, order: 8, renderer: 'date' },
  { id: 'modified_at', label: 'Modified', visible: false, order: 9, renderer: 'date' },
  { id: 'parent_folder', label: 'Parent Folder', visible: false, order: 10, renderer: 'text' },
  { id: 'folder_depth', label: 'Folder Depth', visible: false, order: 11, renderer: 'number' },
  { id: 'file_path_segments', label: 'Path Segments', visible: false, order: 12, renderer: 'text' },
  { id: 'file_hash', label: 'File Hash', visible: false, order: 13, renderer: 'text' },
  { id: 'mime_type', label: 'MIME Type', visible: false, order: 14, renderer: 'text' },
  { id: 'content_type', label: 'Content Type', visible: false, order: 15, renderer: 'text' },
]

/**
 * Common columns - optional columns that analysts commonly use
 * These are not in the default schema but can be enabled per analyst preference
 * ELITE: Pre-defined for easy selection, stored in inventory_data JSON
 */
export const COMMON_COLUMNS: TableColumn[] = [
  { id: 'date_received', label: 'Date Received', visible: false, order: 100, renderer: 'date', fieldPath: 'inventory_data.date_received' },
  { id: 'bates_stamp', label: 'Bates Stamp', visible: false, order: 101, renderer: 'editable', fieldPath: 'inventory_data.bates_stamp' },
  { id: 'notes', label: 'Notes', visible: false, order: 102, renderer: 'text', fieldPath: 'inventory_data.notes' },
]

/**
 * Get global default column configuration
 * ELITE: Cached global config for performance with version-based invalidation
 * Note: Sync version uses cache only, use async version for fresh data
 */
let globalConfigCache: TableColumnConfig | null = null
let globalConfigVersion: number = 1

export function getGlobalColumnConfig(): TableColumnConfig {
  if (typeof window === 'undefined') {
    return { columns: DEFAULT_COLUMNS, version: globalConfigVersion }
  }

  if (globalConfigCache && globalConfigCache.version === globalConfigVersion) {
    return globalConfigCache
  }

  // No sync fallback - use async version instead
  globalConfigCache = { columns: DEFAULT_COLUMNS, version: globalConfigVersion }
  return globalConfigCache
}

/**
 * Async version that loads from database (with store fallback)
 * ELITE: Database-first approach for better persistence and portability
 */
export async function getGlobalColumnConfigAsync(): Promise<TableColumnConfig> {
  if (globalConfigCache) {
    return globalConfigCache
  }

  // Try database first
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const dbConfig = await invoke<string | null>('get_column_config_db', { caseId: null });
    
    if (dbConfig) {
      const parsed = JSON.parse(dbConfig) as TableColumnConfig;
      if (parsed && parsed.columns) {
        const merged = mergeWithDefaults(parsed.columns);
        globalConfigCache = { columns: merged, version: parsed.version || 1 };
        return globalConfigCache;
      }
    }
  } catch (error) {
    console.warn('Failed to get global column config from database, falling back to store:', error);
  }

  // Fallback to store for backward compatibility
  const stored = await getStoreValue<TableColumnConfig>('table_columns_global', { columns: DEFAULT_COLUMNS, version: 1 }, 'app');
  
  if (stored && stored.columns) {
    const merged = mergeWithDefaults(stored.columns);
    globalConfigCache = { columns: merged, version: stored.version || 1 };
    return globalConfigCache;
  }

  globalConfigCache = { columns: DEFAULT_COLUMNS, version: 1 };
  return globalConfigCache;
}

/**
 * Get column configuration from store or return defaults
 * ELITE: Supports global defaults with case-specific overrides
 * Note: Sync version uses cache only, use async version for fresh data
 */
export function getColumnConfig(caseId?: string): TableColumnConfig {
  if (typeof window === 'undefined') {
    return { columns: DEFAULT_COLUMNS, version: 1 }
  }

  // Get global defaults first (from cache)
  const globalConfig = getGlobalColumnConfig()
  
  // If no case ID, return global config
  if (!caseId) {
    return globalConfig
  }

  // No sync access to case-specific config - return global defaults
  // Use getColumnConfigAsync for case-specific config
  return globalConfig
}

/**
 * Async version that loads from database (with store fallback)
 * ELITE: Database-first approach for better persistence and portability
 */
export async function getColumnConfigAsync(caseId?: string): Promise<TableColumnConfig> {
  // Get global defaults first
  const globalConfig = await getGlobalColumnConfigAsync()
  
  // If no case ID, return global config
  if (!caseId) {
    return globalConfig
  }

  // Try database first
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const dbConfig = await invoke<string | null>('get_column_config_db', { caseId });
    
    if (dbConfig) {
      const parsed = JSON.parse(dbConfig) as TableColumnConfig;
      if (parsed && parsed.columns) {
        // Merge case-specific with global defaults
        const merged = mergeWithCaseOverrides(globalConfig.columns, parsed.columns);
        return { columns: merged, version: parsed.version || 1 };
      }
    }
  } catch (error) {
    console.warn('Failed to get column config from database, falling back to store:', error);
  }

  // Fallback to store for backward compatibility
  const caseKey = `table_columns_${caseId}`;
  const stored = await getStoreValue<TableColumnConfig>(caseKey, globalConfig, 'app');
  
  if (stored && stored.columns) {
    // Merge case-specific with global defaults
    const merged = mergeWithCaseOverrides(globalConfig.columns, stored.columns);
    return { columns: merged, version: stored.version || 1 };
  }

  // No case-specific config, return global defaults
  return globalConfig;
}

/**
 * Save global column configuration
 * ELITE: Invalidates cache on save for consistency, increments version
 */
export async function saveGlobalColumnConfig(config: TableColumnConfig): Promise<void> {
  if (typeof window === 'undefined') return

  globalConfigVersion = (config.version || globalConfigVersion) + 1
  globalConfigCache = { ...config, version: globalConfigVersion }
  await setStoreValue('table_columns_global', globalConfigCache, 'app')
}

/**
 * Save column configuration to database (with store fallback)
 * ELITE: Database-first approach for better persistence and portability
 */
export async function saveColumnConfig(config: TableColumnConfig, caseId?: string): Promise<void> {
  if (typeof window === 'undefined') return

  // Try database first
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const configJson = JSON.stringify(config);
    await invoke('save_column_config_db', {
      caseId: caseId || null,
      configData: configJson,
      version: config.version || 1,
    });
    
    // Also update cache
    if (caseId) {
      // Case-specific config - don't update global cache
    } else {
      globalConfigVersion = (config.version || globalConfigVersion) + 1;
      globalConfigCache = { ...config, version: globalConfigVersion };
    }
    
    return; // Success, no need for fallback
  } catch (error) {
    console.warn('Failed to save column config to database, falling back to store:', error);
  }

  // Fallback to store for backward compatibility
  if (caseId) {
    // Case-specific override
    const key = `table_columns_${caseId}`;
    await setStoreValue(key, config, 'app');
  } else {
    // Global default
    await saveGlobalColumnConfig(config);
  }
}

/**
 * Merge stored columns with defaults to ensure new columns are available
 * ELITE: Efficient Map-based merging for O(n) performance
 * Includes: DEFAULT_COLUMNS, COMMON_COLUMNS, and custom columns
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

  // Add common/optional columns
  for (const commonCol of COMMON_COLUMNS) {
    const storedCol = storedMap.get(commonCol.id)
    if (storedCol) {
      // Use stored settings but keep common column properties
      merged.push({
        ...commonCol,
        ...storedCol,
        custom: false, // Common columns aren't custom
      })
      storedMap.delete(commonCol.id)
    } else {
      merged.push(commonCol)
    }
  }

  // Add any custom columns that aren't in defaults or common columns
  for (const customCol of stored) {
    if (customCol.custom && 
        !DEFAULT_COLUMNS.find(d => d.id === customCol.id) &&
        !COMMON_COLUMNS.find(c => c.id === customCol.id)) {
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

/**
 * Get common columns that can be enabled
 * ELITE: Returns copy to prevent mutation
 */
export function getCommonColumns(): TableColumn[] {
  return [...COMMON_COLUMNS]
}

/**
 * Validate column configuration
 * ELITE: Type checking and validation utilities
 */
export function validateColumnConfig(config: TableColumnConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!config.columns || !Array.isArray(config.columns)) {
    errors.push('Columns must be an array')
    return { valid: false, errors }
  }
  
  const columnIds = new Set<string>()
  for (const col of config.columns) {
    if (!col.id || typeof col.id !== 'string') {
      errors.push(`Column missing or invalid id: ${JSON.stringify(col)}`)
      continue
    }
    
    if (columnIds.has(col.id)) {
      errors.push(`Duplicate column id: ${col.id}`)
    }
    columnIds.add(col.id)
    
    if (col.custom && !col.fieldPath) {
      errors.push(`Custom column ${col.id} must have fieldPath`)
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Generate columns from schema (MappingConfig)
 * ELITE: Schema-driven - columns are derived from mapping configuration
 * The schema defines the inventory shape, so columns reflect available schema fields
 * 
 * @param mappingConfig - The mapping configuration (schema) that defines available fields
 * @param existingColumns - Existing column config to merge with (preserves visibility/order settings)
 * @returns TableColumn[] with columns for all enabled mappings in the schema
 */
export function generateColumnsFromSchema(
  mappingConfig: MappingConfig,
  existingColumns: TableColumn[] = []
): TableColumn[] {
  // Create a map of existing columns by ID to preserve user preferences
  const existingMap = new Map(existingColumns.map(col => [col.id, col]));
  const schemaColumns: TableColumn[] = [];
  
  // Core columns are always available (not schema-driven)
  const coreColumnIds = new Set([
    'id', 'absolute_path', 'status', 'tags', 
    'file_name', 'folder_name', 'folder_path', 'file_type'
  ]);
  
  // Get all enabled mappings from schema, sorted by priority
  const enabledMappings = mappingConfig.mappings
    .filter(m => m.enabled)
    .sort((a, b) => (a.priority || 999) - (b.priority || 999));
  
  // Generate columns for each enabled mapping
  // Each mapping.columnId becomes a column that reads from inventory_data.{columnId}
  for (const mapping of enabledMappings) {
    const columnId = mapping.columnId;
    
    // Skip core columns (they're not schema-driven)
    if (coreColumnIds.has(columnId)) {
      continue;
    }
    
    // Check if column already exists
    const existing = existingMap.get(columnId);
    
    if (existing) {
      // Preserve existing column settings (visibility, order, etc.)
      // But ensure fieldPath is correct
      schemaColumns.push({
        ...existing,
        fieldPath: `inventory_data.${columnId}`,
        custom: true, // Schema fields are custom (not default file system fields)
      });
    } else {
      // Create new column from schema
      const fieldPath = `inventory_data.${columnId}`;
      
      // Determine renderer type based on extraction method
      let renderer: TableColumn['renderer'] = 'text';
      if (mapping.extractionMethod === 'date') {
        renderer = 'date';
      } else if (mapping.extractionMethod === 'number') {
        renderer = 'number';
      }
      
      schemaColumns.push({
        id: columnId,
        label: mapping.description || columnId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        visible: false, // New schema columns hidden by default (user can enable)
        order: (mapping.priority || 999) + 1000, // Schema columns start at order 1000+
        fieldPath,
        custom: true,
        renderer,
      });
    }
  }
  
  // Merge with existing columns (preserve core columns, common columns, and user customizations)
  const allColumns: TableColumn[] = [];
  
  // Add core/default columns first
  for (const defaultCol of DEFAULT_COLUMNS) {
    const existing = existingMap.get(defaultCol.id);
    if (existing) {
      allColumns.push(existing);
    } else {
      allColumns.push(defaultCol);
    }
  }
  
  // Add common/optional columns (available for selection but not in defaults)
  for (const commonCol of COMMON_COLUMNS) {
    const existing = existingMap.get(commonCol.id);
    if (existing) {
      // Preserve user's visibility/order settings
      allColumns.push(existing);
    } else {
      // Add common column (hidden by default, user can enable)
      allColumns.push(commonCol);
    }
  }
  
  // Add schema-driven columns (from mappings)
  allColumns.push(...schemaColumns);
  
  // Add any other custom columns that aren't in schema, defaults, or common columns
  for (const existing of existingColumns) {
    if (!coreColumnIds.has(existing.id) && 
        !schemaColumns.find(sc => sc.id === existing.id) &&
        !DEFAULT_COLUMNS.find(dc => dc.id === existing.id) &&
        !COMMON_COLUMNS.find(cc => cc.id === existing.id)) {
      allColumns.push(existing);
    }
  }
  
  // Sort by order
  allColumns.sort((a, b) => a.order - b.order);
  
  return allColumns;
}

/**
 * Sync column configuration with schema
 * ELITE: When schema changes, update columns to reflect available fields
 * This ensures columns are always driven by the schema
 * 
 * @param mappingConfig - The mapping configuration (schema)
 * @param caseId - Optional case ID for case-specific config
 * @returns Updated TableColumnConfig synced with schema
 */
export async function syncColumnsWithSchema(
  mappingConfig: MappingConfig,
  caseId?: string
): Promise<TableColumnConfig> {
  // Get existing column config
  const existingConfig = await getColumnConfigAsync(caseId);
  
  // Generate columns from schema, preserving user preferences
  const syncedColumns = generateColumnsFromSchema(mappingConfig, existingConfig.columns);
  
  // Create updated config
  const updatedConfig: TableColumnConfig = {
    columns: syncedColumns,
    version: (existingConfig.version || 1) + 1,
  };
  
  // Save updated config
  await saveColumnConfig(updatedConfig, caseId);
  
  return updatedConfig;
}

