/**
 * Time Tracking Type Definitions
 * 
 * ELITE: Comprehensive type definitions for time tracking system
 * with JSDoc documentation for better IDE support
 */

/**
 * Billing type - either fixed price or pay rate
 */
export type BillingType = 'fixed_price' | 'pay_rate';

/**
 * Rate unit for pay rate billing
 */
export type RateUnit = 'hourly' | 'daily' | 'weekly' | 'monthly';

/**
 * Billing configuration for a case
 */
export interface BillingConfig {
  /** Billing type - fixed price or pay rate */
  billing_type: BillingType;
  /** Fixed price amount (only if billing_type is 'fixed_price') */
  fixed_price?: number;
  /** Pay rate amount (only if billing_type is 'pay_rate') */
  pay_rate?: number;
  /** Rate unit (only if billing_type is 'pay_rate') */
  rate_unit?: RateUnit;
  /** Timestamp when config was created */
  created_at: number;
  /** Timestamp when config was last updated */
  updated_at: number;
}

/**
 * Time segment - individual time tracking period within a day
 */
export interface TimeSegment {
  /** Unique segment ID */
  id: string;
  /** ID of the parent time entry */
  time_entry_id: string;
  /** Start time (Unix timestamp) */
  start_time: number;
  /** End time (Unix timestamp, null if still running) */
  end_time: number | null;
  /** Duration in seconds (null if still running, cached for performance) */
  duration_seconds: number | null;
  /** Optional rate override for this segment */
  rate_override?: number;
  /** Discount percentage (0-100) */
  discount_percent: number;
  /** Optional notes for this segment */
  notes?: string;
  /** Timestamp when segment was created */
  created_at: number;
  /** Timestamp when segment was last updated */
  updated_at: number;
}

/**
 * Time entry - represents a day's worth of time tracking
 */
export interface TimeEntry {
  /** Unique entry ID */
  id: string;
  /** ID of the case this entry belongs to */
  case_id: string;
  /** Entry date (Unix timestamp for start of day) */
  entry_date: number;
  /** Total tracked time for the day in seconds (calculated from segments) */
  total_seconds: number;
  /** Daily summary/notes for billing */
  summary?: string;
  /** Time segments for this day */
  segments: TimeSegment[];
  /** Timestamp when entry was created */
  created_at: number;
  /** Timestamp when entry was last updated */
  updated_at: number;
}

/**
 * Active timer state
 */
export interface ActiveTimer {
  /** ID of the case with active timer */
  case_id: string;
  /** ID of the current time segment (null if paused) */
  current_segment_id: string | null;
  /** When timer started (Unix timestamp) */
  started_at: number;
  /** Last update timestamp */
  last_updated_at: number;
  /** Elapsed seconds (calculated client-side) */
  elapsed_seconds: number;
}

/**
 * Time entries summary (aggregated totals)
 */
export interface TimeSummary {
  /** Total seconds tracked */
  total_seconds: number;
  /** Total days with entries */
  total_days: number;
}

/**
 * Billing total for a case
 */
export interface BillingTotal {
  /** Total billable amount */
  total_amount: number;
  /** Total seconds tracked */
  total_seconds: number;
  /** Total days with entries */
  total_days: number;
}
