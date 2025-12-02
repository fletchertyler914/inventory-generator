/**
 * Mapping service for field extraction configuration
 * ELITE: High-performance mapping CRUD operations with caching
 */

import type { FieldMapping, MappingConfig } from '@/types/mapping'
import { getMappingConfig, saveMappingConfig } from '@/types/mapping'

/**
 * Get all mappings for a case (or global)
 * ELITE: Cached for performance
 */
export function getMappings(caseId?: string): FieldMapping[] {
  const config = getMappingConfig(caseId)
  return config.mappings.filter(m => m.enabled)
}

/**
 * Get mapping by ID
 */
export function getMappingById(mappingId: string, caseId?: string): FieldMapping | undefined {
  const config = getMappingConfig(caseId)
  return config.mappings.find(m => m.id === mappingId)
}

/**
 * Get mappings for a specific column
 */
export function getMappingsForColumn(columnId: string, caseId?: string): FieldMapping[] {
  const config = getMappingConfig(caseId)
  return config.mappings.filter(m => m.columnId === columnId && m.enabled)
}

/**
 * Add a new mapping
 * ELITE: Efficient array operations
 */
export async function addMapping(mapping: FieldMapping, caseId?: string): Promise<void> {
  const config = getMappingConfig(caseId)
  const updatedMappings = [...config.mappings, mapping]
  const updatedConfig: MappingConfig = {
    ...config,
    mappings: updatedMappings,
    version: config.version + 1,
  }
  await saveMappingConfig(updatedConfig, caseId)
}

/**
 * Update an existing mapping
 * ELITE: Immutable update pattern
 */
export async function updateMapping(mappingId: string, updates: Partial<FieldMapping>, caseId?: string): Promise<void> {
  const config = getMappingConfig(caseId)
  const updatedMappings = config.mappings.map(m =>
    m.id === mappingId ? { ...m, ...updates } : m
  )
  const updatedConfig: MappingConfig = {
    ...config,
    mappings: updatedMappings,
    version: config.version + 1,
  }
  await saveMappingConfig(updatedConfig, caseId)
}

/**
 * Delete a mapping
 */
export async function deleteMapping(mappingId: string, caseId?: string): Promise<void> {
  const config = getMappingConfig(caseId)
  const updatedMappings = config.mappings.filter(m => m.id !== mappingId)
  const updatedConfig: MappingConfig = {
    ...config,
    mappings: updatedMappings,
    version: config.version + 1,
  }
  await saveMappingConfig(updatedConfig, caseId)
}

/**
 * Toggle mapping enabled state
 */
export async function toggleMapping(mappingId: string, caseId?: string): Promise<void> {
  const mapping = getMappingById(mappingId, caseId)
  if (mapping) {
    await updateMapping(mappingId, { enabled: !mapping.enabled }, caseId)
  }
}

/**
 * Get active mappings count
 */
export function getActiveMappingsCount(caseId?: string): number {
  return getMappings(caseId).length
}

/**
 * Clear all case-specific mappings (reset to global)
 */
export async function clearCaseMappings(caseId: string): Promise<void> {
  if (typeof window === 'undefined') return
  const { removeStoreValue } = await import('@/lib/store-utils')
  const key = `field_mappings_${caseId}`
  await removeStoreValue(key, 'app')
  // Also remove from localStorage for backward compatibility
  localStorage.removeItem(key)
}

/**
 * Export mappings as JSON
 */
export function exportMappings(caseId?: string): string {
  const config = getMappingConfig(caseId)
  return JSON.stringify(config, null, 2)
}

/**
 * Import mappings from JSON
 */
export async function importMappings(json: string, caseId?: string): Promise<void> {
  try {
    const config = JSON.parse(json) as MappingConfig
    await saveMappingConfig(config, caseId)
  } catch (error) {
    throw new Error(`Failed to import mappings: ${error}`)
  }
}

