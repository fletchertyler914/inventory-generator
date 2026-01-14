/**
 * Billing Calculation Utilities
 *
 * ELITE: Utility functions for calculating billable amounts and rates
 * - Segment-level billing calculations
 * - Effective rate determination (default vs override)
 * - Discount application
 * - Fixed price handling
 */

import type { TimeSegment, BillingConfig } from "@/types/timeTracking"

/**
 * Get the effective rate for a segment
 * - Returns rate_override if present
 * - Otherwise returns case default pay_rate
 * - Returns null if fixed_price or no rate configured
 */
export function getEffectiveRate(
  segment: TimeSegment,
  billingConfig: BillingConfig | null
): number | null {
  if (!billingConfig) return null

  if (billingConfig.billing_type === "fixed_price") {
    return null // Fixed price doesn't have hourly rate
  }

  // Use override if present, otherwise use default
  return segment.rate_override ?? billingConfig.pay_rate ?? null
}

/**
 * Calculate billable amount for a single segment
 * - Returns 0 or null for fixed_price cases
 * - Uses rate_override if present, else default rate
 * - Applies discount percentage
 * - Converts duration to hours (always hourly for segment display)
 */
export function calculateSegmentBillableAmount(
  segment: TimeSegment,
  billingConfig: BillingConfig | null
): number | null {
  if (!billingConfig) return null

  // Fixed price cases don't bill per segment
  if (billingConfig.billing_type === "fixed_price") {
    return null
  }

  // Need duration to calculate
  if (!segment.duration_seconds || segment.duration_seconds <= 0) {
    return 0
  }

  // Get effective rate
  const rate = getEffectiveRate(segment, billingConfig)
  if (rate === null) {
    return null
  }

  // Convert duration to hours (always hourly for segment-level display)
  const hours = segment.duration_seconds / 3600

  // Calculate base amount
  const baseAmount = hours * rate

  // Apply discount
  const discountMultiplier = 1 - segment.discount_percent / 100
  const finalAmount = baseAmount * discountMultiplier

  return finalAmount
}

/**
 * Format billable amount for display
 * - Formats as currency for numeric values
 * - Returns "N/A" or "Tracking only" for fixed_price/null
 */
export function formatBillableAmount(amount: number | null, isFixedPrice: boolean = false): string {
  if (isFixedPrice || amount === null) {
    return "Tracking only"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format rate for display
 * - Shows default rate or override rate
 * - Returns just the rate string without indicators
 */
export function formatRateDisplay(
  segment: TimeSegment,
  billingConfig: BillingConfig | null
): string {
  if (!billingConfig) {
    return "No rate configured"
  }

  if (billingConfig.billing_type === "fixed_price") {
    return "Fixed price"
  }

  const effectiveRate = getEffectiveRate(segment, billingConfig)
  if (effectiveRate === null) {
    return "No rate"
  }

  return `$${effectiveRate.toFixed(2)}/hr`
}

/**
 * Check if segment uses rate override
 */
export function hasRateOverride(segment: TimeSegment): boolean {
  return segment.rate_override !== undefined && segment.rate_override !== null
}
