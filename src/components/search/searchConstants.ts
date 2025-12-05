/**
 * ELITE: Search constants and types
 * Centralized match types and configuration
 */

export const MATCH_TYPES = {
  FILE: "file",
  NOTE: "note",
  FINDING: "finding",
  TIMELINE: "timeline",
} as const;

export type MatchType = typeof MATCH_TYPES[keyof typeof MATCH_TYPES];

export const SEARCH_CONFIG = {
  MAX_RESULTS: 50,
  MAX_PROCESSED: 5000,
  DEBOUNCE_MS: 300,
} as const;

