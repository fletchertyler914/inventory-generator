/**
 * Field mapping system for generic data extraction
 * ELITE: Type-safe, performant mapping configuration
 */

import { setStoreValue } from '@/lib/store-utils';

/**
 * Data source types for field extraction
 */
export type DataSourceType = 
  | 'file_name'
  | 'folder_name'
  | 'folder_path'
  | 'file_metadata'
  | 'custom_pattern'

/**
 * Extraction methods for field mapping
 */
export type ExtractionMethod = 
  | 'direct' // Use field as-is
  | 'pattern' // Extract using pattern/regex
  | 'date' // Extract date
  | 'number' // Extract number
  | 'text_before' // Text before pattern
  | 'text_after' // Text after pattern
  | 'text_between' // Text between two patterns

/**
 * Pattern configuration for extraction
 */
export interface PatternConfig {
  pattern: string // Regex pattern or simple pattern
  flags?: string // Regex flags (e.g., 'i' for case-insensitive)
  group?: number // Capture group number (default: 0 for full match)
  format?: string // Output format (for dates, numbers)
}

/**
 * Field mapping definition
 * Maps a data source to a column with optional extraction rules
 */
export interface FieldMapping {
  id: string // Unique mapping ID
  columnId: string // Target column ID
  sourceType: DataSourceType // Where to extract from
  extractionMethod: ExtractionMethod // How to extract
  patternConfig?: PatternConfig // Pattern configuration (if needed)
  enabled: boolean // Whether mapping is active
  priority?: number // Priority order (lower = higher priority)
  description?: string // User-friendly description
}

/**
 * Mapping configuration
 * Supports global defaults with case-specific overrides
 */
export interface MappingConfig {
  mappings: FieldMapping[]
  version: number
  caseId?: string // If undefined, this is a global config
}

/**
 * Default mapping configurations
 * Common patterns for file system data extraction
 */
export const DEFAULT_MAPPINGS: FieldMapping[] = [
  // File name mappings
  {
    id: 'file_name_direct',
    columnId: 'file_name',
    sourceType: 'file_name',
    extractionMethod: 'direct',
    enabled: true,
    priority: 1,
    description: 'File name as-is',
  },
  // Folder name mappings
  {
    id: 'folder_name_direct',
    columnId: 'folder_name',
    sourceType: 'folder_name',
    extractionMethod: 'direct',
    enabled: true,
    priority: 1,
    description: 'Folder name as-is',
  },
]

/**
 * Get global mapping configuration
 * ELITE: Cached for performance
 */
let globalMappingCache: MappingConfig | null = null

export function getGlobalMappingConfig(): MappingConfig {
  if (typeof window === 'undefined') {
    return { mappings: DEFAULT_MAPPINGS, version: 1 }
  }

  if (globalMappingCache) {
    return globalMappingCache
  }

  const stored = localStorage.getItem('field_mappings_global')
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as MappingConfig
      globalMappingCache = { ...parsed, mappings: parsed.mappings || DEFAULT_MAPPINGS }
      return globalMappingCache
    } catch {
      // Invalid stored data, use defaults
    }
  }

  globalMappingCache = { mappings: DEFAULT_MAPPINGS, version: 1 }
  return globalMappingCache
}

/**
 * Get mapping configuration (global or case-specific)
 * ELITE: Supports global defaults with case-specific overrides
 */
export function getMappingConfig(caseId?: string): MappingConfig {
  if (typeof window === 'undefined') {
    return { mappings: DEFAULT_MAPPINGS, version: 1 }
  }

  // Get global defaults first
  const globalConfig = getGlobalMappingConfig()
  
  // If no case ID, return global config
  if (!caseId) {
    return globalConfig
  }

  // Get case-specific overrides
  const caseKey = `field_mappings_${caseId}`
  const stored = localStorage.getItem(caseKey)
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as MappingConfig
      // Merge case-specific with global defaults
      const merged = mergeMappingConfigs(globalConfig, parsed)
      return merged
    } catch {
      // Invalid stored data, use global defaults
    }
  }

  // No case-specific config, return global defaults
  return globalConfig
}

/**
 * Save global mapping configuration
 * ELITE: Invalidates cache on save
 */
export async function saveGlobalMappingConfig(config: MappingConfig): Promise<void> {
  if (typeof window === 'undefined') return

  globalMappingCache = config
  await setStoreValue('field_mappings_global', config, 'app')
  // Also save to localStorage for backward compatibility
  localStorage.setItem('field_mappings_global', JSON.stringify(config))
}

/**
 * Save mapping configuration
 * ELITE: Supports global and case-specific saves
 */
export async function saveMappingConfig(config: MappingConfig, caseId?: string): Promise<void> {
  if (typeof window === 'undefined') return

  if (caseId) {
    // Case-specific override
    const key = `field_mappings_${caseId}`
    await setStoreValue(key, config, 'app')
    // Also save to localStorage for backward compatibility
    localStorage.setItem(key, JSON.stringify(config))
  } else {
    // Global default
    await saveGlobalMappingConfig(config)
  }
}

/**
 * Merge mapping configurations
 * ELITE: Case-specific mappings override global, new globals are added
 */
function mergeMappingConfigs(global: MappingConfig, caseSpecific: MappingConfig): MappingConfig {
  const globalMap = new Map(global.mappings.map(m => [m.id, m]))
  const caseMap = new Map(caseSpecific.mappings.map(m => [m.id, m]))
  const merged: FieldMapping[] = []

  // Start with all global mappings
  for (const globalMapping of global.mappings) {
    const caseMapping = caseMap.get(globalMapping.id)
    if (caseMapping) {
      // Case-specific override exists
      merged.push(caseMapping)
      caseMap.delete(globalMapping.id)
    } else {
      // No case override, use global default
      merged.push(globalMapping)
    }
  }

  // Add any case-specific mappings that aren't in global
  for (const caseMapping of caseSpecific.mappings) {
    if (!globalMap.has(caseMapping.id)) {
      merged.push(caseMapping)
    }
  }

  // Sort by priority
  merged.sort((a, b) => (a.priority || 999) - (b.priority || 999))

  return {
    mappings: merged,
    version: Math.max(global.version, caseSpecific.version),
    ...(caseSpecific.caseId !== undefined && { caseId: caseSpecific.caseId }),
  }
}

/**
 * Validate pattern configuration
 */
export function validatePattern(pattern: string, method: ExtractionMethod): { valid: boolean; error?: string } {
  if (method === 'direct') {
    return { valid: true }
  }

  if (!pattern || pattern.trim().length === 0) {
    return { valid: false, error: 'Pattern is required' }
  }

  // Try to compile as regex
  try {
    new RegExp(pattern)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: `Invalid regex pattern: ${e}` }
  }
}

