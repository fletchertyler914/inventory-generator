/**
 * TimeCalendarDayButton Component
 * 
 * Beautiful, intuitive calendar day cell matching list view aesthetic
 * Grounded in UI/UX psychology: clear visual hierarchy, meaningful affordances, immediate feedback
 */

import * as React from "react"
import { DayButton, getDefaultClassNames } from "react-day-picker"
import { Button } from "../ui/button"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/time-utils"
import { formatBillableAmount } from "@/lib/billing-utils"
import { CheckCircle2, Circle } from "lucide-react"
import type { TimeEntry, BillingConfig } from "@/types/timeTracking"

interface TimeCalendarDayButtonProps extends React.ComponentProps<typeof DayButton> {
  entry?: TimeEntry
  entryStatus?: boolean | null // true = complete, false = in-progress, null = no entry
  billingConfig?: BillingConfig | null
  calculateBillable?: (entry: TimeEntry) => number | null
  matchesSearch?: boolean
}

export function TimeCalendarDayButton({
  className,
  day,
  modifiers,
  entry,
  entryStatus,
  billingConfig,
  calculateBillable,
  matchesSearch,
  ...props
}: TimeCalendarDayButtonProps) {
  const defaultClassNames = getDefaultClassNames()
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers["focused"] && ref.current) {
      ref.current.focus()
    }
  }, [modifiers["focused"]])

  const hasEntry = entry !== undefined
  const isComplete = entryStatus === true
  const isInProgress = entryStatus === false
  const isToday = modifiers["today"]
  const isSelected = modifiers["selected"]
  const isOutsideMonth = modifiers["outside"]

  // Calculate billable amount
  const billableAmount = entry && calculateBillable ? calculateBillable(entry) : null

  // Day cell design: Card-like appearance matching list view
  // CRITICAL: All cells must have identical height - no exceptions
  const dayButton = (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={isSelected}
      data-has-entry={hasEntry}
      data-entry-complete={isComplete}
      data-entry-in-progress={isInProgress}
      data-matches-search={matchesSearch || modifiers["matchesSearch"]}
      data-today={isToday}
      data-outside={isOutsideMonth}
      className={cn(
        // CRITICAL: All cards must be identical dimensions - no exceptions
        "group/day-cell relative w-full h-full rounded-lg",
        "bg-card border border-border/30 dark:border-border/40",
        "flex flex-col",
        "transition-all duration-200",
        // Prevent any overflow that could affect size
        "overflow-hidden",
        // Force exact sizing - no content can change dimensions
        "min-h-0 max-h-full min-w-0 max-w-full",
        // Prevent width expansion - critical for responsiveness
        "w-full max-w-full",
        // Hover: Clear affordance
        "hover:border-border/50 hover:shadow-sm",
        // Selected: Clear feedback
        "data-[selected-single=true]:border-primary data-[selected-single=true]:ring-2 data-[selected-single=true]:ring-primary/20",
        // Today: Subtle highlight
        "data-[today=true]:bg-accent/30",
        // Outside month: Muted
        "data-[outside=true]:opacity-40",
        // Has entry: Enhanced styling
        "data-[has-entry=true]:border-border/50 data-[has-entry=true]:bg-muted/10",
        "data-[has-entry=true]:hover:bg-muted/20 data-[has-entry=true]:hover:shadow-md",
        // Search match: Clear indicator
        "data-[matches-search=true]:ring-2 data-[matches-search=true]:ring-primary/50",
        // Focus: Accessibility
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      {/* Fixed structure - all cards identical dimensions, fully responsive, no overflow possible */}
      <div className="p-2 h-full w-full flex flex-col gap-1.5 min-w-0 max-w-full overflow-hidden">
        {/* Header - Fixed height, always present */}
        <div className="flex items-center justify-between w-full flex-shrink-0 h-5 min-w-0">
          <span
            className={cn(
              "text-sm font-semibold tabular-nums truncate min-w-0",
              isToday ? "text-primary" : "text-foreground",
              isOutsideMonth && "text-muted-foreground"
            )}
          >
            {day.date.getDate()}
          </span>

          {/* Status Icon */}
          {hasEntry && (
            <div className="flex-shrink-0 ml-1">
              {isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 fill-green-500/20" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20" />
              )}
            </div>
          )}
        </div>

        {/* Content - Fixed structure, always same height, left-aligned, well-balanced, responsive */}
        <div className="flex-1 w-full flex flex-col gap-1 min-h-0 overflow-hidden min-w-0 max-w-full">
          {/* Time and Billing - Same line to condense vertical space, responsive */}
          <div className="h-4 flex items-center gap-1.5 min-w-0 max-w-full overflow-hidden">
            {hasEntry && entry ? (
              <>
                <div className="text-xs font-mono tabular-nums text-muted-foreground truncate flex-shrink-0">
                  {formatTime(entry.total_seconds)}
                </div>
                {billableAmount !== null && (
                  <>
                    <span className="text-xs text-muted-foreground/50 flex-shrink-0">•</span>
                    <div className="text-xs font-semibold text-foreground truncate min-w-0 flex-1">
                      {formatBillableAmount(billableAmount, billingConfig?.billing_type === "fixed_price")}
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>

          {/* Summary - Wraps to fill available space, then ellipses after 2 lines */}
          <div className="flex-1 min-h-[2.5rem] w-full min-w-0 max-w-full overflow-hidden">
            {hasEntry && entry && entry.summary ? (
              <p 
                className="text-xs text-muted-foreground leading-relaxed w-full text-left min-w-0 max-w-full"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  hyphens: 'auto',
                }}
              >
                {entry.summary}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Status Indicator Bar - Left border (matching list view) */}
      {hasEntry && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
            isComplete ? "bg-green-500/60" : "bg-blue-500/60"
          )}
        />
      )}
    </Button>
  )

  // No tooltip - all details are in the day card itself
  return dayButton
}
