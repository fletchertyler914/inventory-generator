/**
 * Cache Strategy Documentation
 *
 * This document defines the caching strategy for all service methods.
 * All services should use baseService.serviceInvoke with appropriate cache settings.
 */

/**
 * Standard Cache TTL Values
 *
 * These values are standardized across the application for consistent caching behavior.
 */
export const CACHE_TTL = {
  /** Stable data that rarely changes (configs, source lists) */
  STABLE: 5 * 60 * 1000, // 5 minutes

  /** Frequently changing data (file lists, counts, note counts) */
  FREQUENT: 30 * 1000, // 30 seconds

  /** Very dynamic data (active timers, real-time updates) */
  DYNAMIC: 10 * 1000, // 10 seconds

  /** Long-lived cache for rarely changing data (case lists) */
  LONG: 60 * 1000, // 1 minute
} as const

/**
 * Cache Strategy by Service Method
 *
 * Each service method should document its cache strategy here.
 * This helps maintain consistency and makes cache behavior predictable.
 */

export const CACHE_STRATEGY = {
  // Case Service
  list_cases: {
    ttl: CACHE_TTL.LONG,
    description: "Case list changes infrequently, cache for 1 minute",
    invalidateOn: ["create_case", "delete_case"],
  },
  get_case: {
    ttl: 0, // No cache - case data may change
    description: "Case data may be updated, no cache",
  },
  create_case: {
    ttl: 0, // No cache - write operation
    description: "Write operation, invalidates list_cases cache",
  },
  update_case_metadata: {
    ttl: 0, // No cache - write operation
    description: "Write operation, may invalidate case caches",
  },
  delete_case: {
    ttl: 0, // No cache - write operation
    description: "Write operation, invalidates list_cases cache",
  },

  // File Service
  load_case_files_with_inventory: {
    ttl: CACHE_TTL.FREQUENT,
    description: "File list changes frequently, cache for 30 seconds",
    invalidateOn: ["ingest_files_to_case", "sync_case_all_sources", "remove_file_from_case"],
  },
  get_case_file_count: {
    ttl: CACHE_TTL.FREQUENT,
    description: "File count changes frequently, cache for 30 seconds",
    invalidateOn: ["ingest_files_to_case", "sync_case_all_sources", "remove_file_from_case"],
  },
  list_case_sources: {
    ttl: CACHE_TTL.STABLE,
    description: "Source list changes infrequently, cache for 5 minutes",
    invalidateOn: ["add_case_source"],
  },

  // Note Service
  get_file_note_counts: {
    ttl: CACHE_TTL.FREQUENT,
    description: "Note counts change frequently, cache for 30 seconds",
    invalidateOn: ["create_note", "update_note", "delete_note", "toggle_note_pinned"],
  },
  list_notes: {
    ttl: 0, // No cache - notes may be updated
    description: "Notes may be updated, no cache",
  },

  // Duplicate Service
  find_all_duplicate_groups: {
    ttl: CACHE_TTL.FREQUENT,
    description: "Duplicate groups change when files are added/removed, cache for 30 seconds",
    invalidateOn: ["ingest_files_to_case", "remove_file_from_case"],
  },
  get_duplicate_group: {
    ttl: CACHE_TTL.FREQUENT,
    description: "Duplicate group data changes when files are modified, cache for 30 seconds",
    invalidateOn: ["mark_duplicate_primary", "merge_duplicate_metadata"],
  },

  // Time Service
  get_active_timer: {
    ttl: CACHE_TTL.DYNAMIC,
    description: "Active timer changes frequently, cache for 10 seconds",
    invalidateOn: ["start_timer", "pause_timer", "resume_timer", "stop_timer"],
  },
  get_time_summary: {
    ttl: CACHE_TTL.FREQUENT,
    description: "Time summary changes when timers are used, cache for 30 seconds",
    invalidateOn: ["start_timer", "stop_timer", "create_time_entry"],
  },
} as const

/**
 * Cache Invalidation Rules
 *
 * When a write operation occurs, these rules determine which caches should be invalidated.
 */
export const CACHE_INVALIDATION = {
  create_case: ["list_cases"],
  delete_case: ["list_cases"],
  ingest_files_to_case: [
    "load_case_files_with_inventory",
    "get_case_file_count",
    "find_all_duplicate_groups",
  ],
  sync_case_all_sources: [
    "load_case_files_with_inventory",
    "get_case_file_count",
    "find_all_duplicate_groups",
  ],
  remove_file_from_case: [
    "load_case_files_with_inventory",
    "get_case_file_count",
    "find_all_duplicate_groups",
  ],
  add_case_source: ["list_case_sources"],
  create_note: ["get_file_note_counts"],
  update_note: ["get_file_note_counts"],
  delete_note: ["get_file_note_counts"],
  toggle_note_pinned: ["get_file_note_counts"],
  mark_duplicate_primary: ["get_duplicate_group"],
  merge_duplicate_metadata: ["get_duplicate_group", "find_all_duplicate_groups"],
  start_timer: ["get_active_timer", "get_time_summary"],
  pause_timer: ["get_active_timer"],
  resume_timer: ["get_active_timer"],
  stop_timer: ["get_active_timer", "get_time_summary"],
  create_time_entry: ["get_time_summary"],
} as const

/**
 * Helper function to get cache TTL for a command
 */
export function getCacheTtl(command: string): number {
  const strategy = CACHE_STRATEGY[command as keyof typeof CACHE_STRATEGY]
  return strategy?.ttl ?? 0
}

/**
 * Helper function to check if a command should be cached
 */
export function shouldCache(command: string): boolean {
  const ttl = getCacheTtl(command)
  return ttl > 0
}
