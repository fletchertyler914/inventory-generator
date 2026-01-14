/**
 * Time Tracking Service
 *
 * ELITE: High-performance time tracking service with caching and pagination
 *
 * Features:
 * - Request caching with TTL (5min entries, 30s active timer, 10min config)
 * - Batch operations for bulk updates
 * - Optimistic updates where appropriate
 * - Pagination support for large time entry lists
 * - Efficient aggregation queries for totals
 */

import { serviceInvoke, clearServiceCache } from "./baseService"
import type {
  TimeEntry,
  TimeSegment,
  BillingConfig,
  ActiveTimer,
  TimeSummary,
  BillingTotal,
} from "@/types/timeTracking"
import { ErrorCode } from "@/lib/error-handler"

export const timeService = {
  /**
   * Start timer for case (with auto-stop of other active timers)
   */
  async startTimer(caseId: string): Promise<void> {
    await serviceInvoke("start_timer", { caseId }, { errorCode: ErrorCode.UNKNOWN_ERROR })
    // Invalidate active timer cache for this case only (pattern match)
    clearServiceCache("get_active_timer")
    // Dispatch event for timer state change
    window.dispatchEvent(
      new CustomEvent("timer-state-changed", { detail: { caseId, action: "started" } })
    )
  },

  /**
   * Pause current segment (updates end_time)
   */
  async pauseTimer(caseId: string): Promise<void> {
    await serviceInvoke("pause_timer", { caseId }, { errorCode: ErrorCode.UNKNOWN_ERROR })
    // Invalidate active timer and entries cache
    clearServiceCache("get_active_timer")
    clearServiceCache("get_time_entries")
    clearServiceCache("get_time_entry")
    // Dispatch event for timer state change
    window.dispatchEvent(
      new CustomEvent("timer-state-changed", { detail: { caseId, action: "paused" } })
    )
  },

  /**
   * Resume paused segment (creates new segment)
   */
  async resumeTimer(caseId: string): Promise<void> {
    await serviceInvoke("resume_timer", { caseId }, { errorCode: ErrorCode.UNKNOWN_ERROR })
    // Invalidate active timer cache
    clearServiceCache("get_active_timer")
    // Dispatch event for timer state change
    window.dispatchEvent(
      new CustomEvent("timer-state-changed", { detail: { caseId, action: "resumed" } })
    )
  },

  /**
   * Stop timer, create/update entry, invalidate cache
   */
  async stopTimer(caseId: string, summary?: string): Promise<TimeEntry> {
    const result = await serviceInvoke<TimeEntry>(
      "stop_timer",
      { caseId, summary },
      { errorCode: ErrorCode.UNKNOWN_ERROR }
    )
    // Invalidate all related caches
    clearServiceCache("get_active_timer")
    clearServiceCache("get_time_entries")
    clearServiceCache("get_time_entry")
    clearServiceCache("get_time_entries_summary")
    // Dispatch event for timer state change
    window.dispatchEvent(
      new CustomEvent("timer-state-changed", { detail: { caseId, action: "stopped" } })
    )
    // Handle JSON result from Rust
    if (result && typeof result === "object" && "id" in result) {
      return result as TimeEntry
    }
    return result
  },

  /**
   * Get current timer state (cached 30s)
   */
  async getActiveTimer(caseId: string): Promise<ActiveTimer | null> {
    return serviceInvoke<ActiveTimer | null>(
      "get_active_timer",
      { caseId },
      {
        cache: true,
        cacheTtl: 30 * 1000, // 30 seconds
        errorCode: ErrorCode.UNKNOWN_ERROR,
      }
    )
  },

  /**
   * Get entries with pagination
   */
  async getTimeEntries(caseId: string, limit?: number, offset?: number): Promise<TimeEntry[]> {
    const result = await serviceInvoke<TimeEntry[]>(
      "get_time_entries",
      { caseId, limit, offset },
      {
        cache: true,
        cacheTtl: 5 * 60 * 1000, // 5 minutes
        errorCode: ErrorCode.UNKNOWN_ERROR,
      }
    )
    // Handle JSON array result from Rust
    return result.map((entry) => {
      if (entry && typeof entry === "object" && "id" in entry) {
        return entry as TimeEntry
      }
      return entry
    })
  },

  /**
   * Get entry for specific date (cached 5min)
   */
  async getTimeEntry(caseId: string, date: number): Promise<TimeEntry | null> {
    const result = await serviceInvoke<TimeEntry | null>(
      "get_time_entry",
      { caseId, date },
      {
        cache: true,
        cacheTtl: 5 * 60 * 1000, // 5 minutes
        errorCode: ErrorCode.UNKNOWN_ERROR,
      }
    )
    // Handle JSON result from Rust
    if (result && typeof result === "object" && "id" in result) {
      return result as TimeEntry
    }
    return result
  },

  /**
   * Get time entries summary - aggregated totals (cached 2min)
   */
  async getTimeEntriesSummary(caseId: string): Promise<TimeSummary> {
    return serviceInvoke<TimeSummary>(
      "get_time_entries_summary",
      { caseId },
      {
        cache: true,
        cacheTtl: 2 * 60 * 1000, // 2 minutes
        errorCode: ErrorCode.UNKNOWN_ERROR,
      }
    )
  },

  /**
   * Update entry, invalidate cache
   */
  async updateTimeEntry(entryId: string, updates: Partial<TimeEntry>): Promise<void> {
    await serviceInvoke(
      "update_time_entry",
      { entryId, updates },
      { errorCode: ErrorCode.UNKNOWN_ERROR }
    )
    // Invalidate entries cache
    clearServiceCache("get_time_entries")
    clearServiceCache("get_time_entry")
    clearServiceCache("get_time_entries_summary")
  },

  /**
   * Update segment, recalculate totals
   */
  async updateTimeSegment(segmentId: string, updates: Partial<TimeSegment>): Promise<void> {
    await serviceInvoke(
      "update_time_segment",
      { segmentId, updates },
      { errorCode: ErrorCode.UNKNOWN_ERROR }
    )
    // Invalidate entries cache
    clearServiceCache("get_time_entries")
    clearServiceCache("get_time_entry")
    clearServiceCache("get_time_entries_summary")
  },

  /**
   * Create time segment manually
   */
  async createTimeSegment(
    entryId: string,
    startTime: number,
    endTime: number | null,
    rateOverride?: number,
    discountPercent?: number,
    notes?: string
  ): Promise<TimeSegment> {
    const result = await serviceInvoke<TimeSegment>(
      "create_time_segment",
      {
        entryId,
        startTime,
        endTime,
        rateOverride,
        discountPercent,
        notes,
      },
      { errorCode: ErrorCode.UNKNOWN_ERROR }
    )
    // Invalidate entries cache
    clearServiceCache("get_time_entries")
    clearServiceCache("get_time_entry")
    clearServiceCache("get_time_entries_summary")
    return result
  },

  /**
   * Delete time entry (cascades to segments)
   */
  async deleteTimeEntry(entryId: string): Promise<void> {
    await serviceInvoke(
      "delete_time_entry",
      { entryId },
      { errorCode: ErrorCode.UNKNOWN_ERROR }
    )
    // Invalidate entries cache
    clearServiceCache("get_time_entries")
    clearServiceCache("get_time_entry")
    clearServiceCache("get_time_entries_summary")
  },

  /**
   * Delete segment, recalculate totals
   */
  async deleteTimeSegment(segmentId: string): Promise<void> {
    await serviceInvoke(
      "delete_time_segment",
      { segmentId },
      { errorCode: ErrorCode.UNKNOWN_ERROR }
    )
    // Invalidate entries cache
    clearServiceCache("get_time_entries")
    clearServiceCache("get_time_entry")
    clearServiceCache("get_time_entries_summary")
  },

  /**
   * Batch update segments - ELITE: Batch operation
   */
  async batchUpdateSegments(
    updates: Array<{ id: string; updates: Partial<TimeSegment> }>
  ): Promise<void> {
    await serviceInvoke(
      "batch_update_segments",
      { updates },
      { errorCode: ErrorCode.UNKNOWN_ERROR }
    )
    // Invalidate entries cache
    clearServiceCache("get_time_entries")
    clearServiceCache("get_time_entry")
    clearServiceCache("get_time_entries_summary")
  },

  /**
   * Set case billing config, invalidate cache
   */
  async setCaseBillingConfig(caseId: string, config: BillingConfig): Promise<void> {
    await serviceInvoke(
      "set_case_billing_config",
      { caseId, config },
      { errorCode: ErrorCode.UNKNOWN_ERROR }
    )
    // Invalidate billing config cache
    clearServiceCache("get_case_billing_config")
    clearServiceCache("calculate_billing_amount")
    clearServiceCache("calculate_case_total")
  },

  /**
   * Get case billing config (cached 10min)
   */
  async getCaseBillingConfig(caseId: string): Promise<BillingConfig | null> {
    return serviceInvoke<BillingConfig | null>(
      "get_case_billing_config",
      { caseId },
      {
        cache: true,
        cacheTtl: 10 * 60 * 1000, // 10 minutes
        errorCode: ErrorCode.UNKNOWN_ERROR,
      }
    )
  },

  /**
   * Calculate billable amount for entry
   */
  async calculateBillingAmount(caseId: string, entryId: string): Promise<number> {
    return serviceInvoke<number>(
      "calculate_billing_amount",
      { caseId, entryId },
      {
        cache: true,
        cacheTtl: 5 * 60 * 1000, // 5 minutes
        errorCode: ErrorCode.UNKNOWN_ERROR,
      }
    )
  },

  /**
   * Calculate case total - ELITE: Aggregated billing total for case
   */
  async calculateCaseTotal(caseId: string): Promise<BillingTotal> {
    return serviceInvoke<BillingTotal>(
      "calculate_case_total",
      { caseId },
      {
        cache: true,
        cacheTtl: 2 * 60 * 1000, // 2 minutes
        errorCode: ErrorCode.UNKNOWN_ERROR,
      }
    )
  },
}
