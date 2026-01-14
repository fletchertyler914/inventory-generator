/**
 * Time Utilities
 *
 * ELITE: Utility functions for time formatting, calculations, and validations
 */

/**
 * Format seconds to HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

/**
 * Format seconds to human-readable string (e.g., "2h 30m")
 */
export function formatTimeHuman(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else {
    return `${Math.floor(seconds)}s`
  }
}

/**
 * Get start of day timestamp for a given timestamp
 * ELITE: Uses UTC to match Rust backend (consistent across timezones)
 */
export function getStartOfDayTimestamp(timestamp: number): number {
  // Use UTC to match Rust backend's get_start_of_day_timestamp
  const date = new Date(timestamp * 1000)
  // Get UTC date components
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  // Create new date at UTC midnight
  const utcMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
  return Math.floor(utcMidnight.getTime() / 1000)
}

/**
 * Validate time segment (end_time >= start_time)
 */
export function validateTimeSegment(startTime: number, endTime: number | null): boolean {
  if (endTime === null) return true // Running segment is valid
  return endTime >= startTime
}

/**
 * Calculate duration in seconds from start and end times
 */
export function calculateDuration(startTime: number, endTime: number | null): number | null {
  if (endTime === null) return null
  return Math.max(0, endTime - startTime)
}
