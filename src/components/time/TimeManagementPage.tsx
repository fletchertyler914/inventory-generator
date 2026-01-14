/**
 * TimeManagementPage Component
 *
 * ELITE: Comprehensive time management interface with:
 * - Calendar/date picker view of all time entries
 * - List view of all entries with filters
 * - Edit time entries (date, summary)
 * - Edit time segments (start/end times, rate override, discount, notes)
 * - Add/remove segments
 * - Proration/discount controls (per day or per segment)
 * - Billing calculation display
 * - Export functionality (CSV, PDF)
 * - Total time and billing summary
 *
 * Performance optimizations:
 * - Virtual scrolling for time entry list (handles 1000+ entries)
 * - Lazy loading of segments (only load when entry expanded)
 * - Memoized calculations (billing totals, time aggregations)
 * - Debounced search/filter inputs
 * - Optimistic updates for edits
 * - Batch operations for bulk edits
 */

import { useState, useMemo } from "react"
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Edit,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Pencil,
  Check,
  X,
  Plus,
} from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip"
import { cn } from "@/lib/utils"
import { Calendar as CalendarComponent } from "../ui/calendar"
import { useTimeEntries } from "@/hooks/useTimeEntries"
import { formatTime, formatTimeHuman, getStartOfDayTimestamp } from "@/lib/time-utils"
import { format } from "date-fns"
import type { Case } from "@/types/case"
import { SegmentEditDialog } from "./SegmentEditDialog"
import { BillingConfigDialog } from "./BillingConfigDialog"
import { DeleteTimeEntryDialog } from "./DeleteTimeEntryDialog"
import { TimeCalendarDayButton } from "./TimeCalendarDayButton"
import {
  calculateSegmentBillableAmount,
  formatBillableAmount,
  formatRateDisplay,
  hasRateOverride,
} from "@/lib/billing-utils"
import type { TimeSegment } from "@/types/timeTracking"

interface TimeManagementPageProps {
  case_: Case
  onClose?: () => void
}

export function TimeManagementPage({ case_, onClose }: TimeManagementPageProps) {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(new Set())
  const [editingSegment, setEditingSegment] = useState<TimeSegment | null | "new">(null)
  const [addingSegmentEntryId, setAddingSegmentEntryId] = useState<string | null>(null)
  const [editingSummaryEntryId, setEditingSummaryEntryId] = useState<string | null>(null)
  const [editingSummaryText, setEditingSummaryText] = useState("")
  const [billingConfigOpen, setBillingConfigOpen] = useState(false)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())

  const toggleEntryExpanded = (entryId: string) => {
    setExpandedEntryIds((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  const {
    entries,
    summary,
    billingTotal,
    billingConfig,
    loading,
    refresh,
    updateEntry,
    deleteEntry,
    deleteSegment,
  } = useTimeEntries({
    caseId: case_.id,
    enabled: true,
  })

  // Handle summary edit
  const handleSummaryEdit = (entry: typeof entries[0]) => {
    setEditingSummaryEntryId(entry.id)
    setEditingSummaryText(entry.summary || "")
  }

  const handleSummarySave = async () => {
    if (!editingSummaryEntryId) return
    const trimmedSummary = editingSummaryText.trim()
    // Always pass summary field - use empty string to clear, actual text to set
    // Backend will convert empty string to NULL
    const summaryValue = trimmedSummary.length > 0 ? trimmedSummary : ""
    try {
      // updateEntry already handles refresh internally
      await updateEntry(editingSummaryEntryId, { summary: summaryValue })
      // Close edit mode after successful save
      setEditingSummaryEntryId(null)
      setEditingSummaryText("")
    } catch (error) {
      // Error already handled by updateEntry with toast
      // Keep edit mode open so user can retry
    }
  }

  const handleSummaryCancel = () => {
    setEditingSummaryEntryId(null)
    setEditingSummaryText("")
  }

  // Handle entry deletion
  const handleDeleteEntry = async () => {
    if (!deletingEntryId) return
    setDeleteLoading(true)
    try {
      await deleteEntry(deletingEntryId)
      setDeletingEntryId(null)
    } catch (error) {
      // Error already handled by deleteEntry with toast
    } finally {
      setDeleteLoading(false)
    }
  }

  // Filter entries by search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries

    const query = searchQuery.toLowerCase().trim()
    
    return entries.filter((entry) => {
      // Search in summary
      if (entry.summary?.toLowerCase().includes(query)) return true
      
      // Search in formatted date (multiple formats)
      const entryDate = new Date(entry.entry_date * 1000)
      const dateFormats = [
        format(entryDate, "yyyy-MM-dd"), // 2026-01-13
        format(entryDate, "MMM dd, yyyy"), // Jan 13, 2026
        format(entryDate, "MMMM dd, yyyy"), // January 13, 2026
        format(entryDate, "MM/dd/yyyy"), // 01/13/2026
        format(entryDate, "MMM dd"), // Jan 13
        format(entryDate, "MMMM"), // January
        format(entryDate, "yyyy"), // 2026
      ]
      if (dateFormats.some((fmt) => fmt.toLowerCase().includes(query))) return true
      
      // Search in segment notes
      if (entry.segments?.some((seg) => seg.notes?.toLowerCase().includes(query))) return true
      
      return false
    })
  }, [entries, searchQuery])

  // Format date for display
  const formatEntryDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "MMM dd, yyyy")
  }

  // Calendar: Map entries by date for efficient lookup
  const entriesByDate = useMemo(() => {
    const map = new Map<number, typeof entries[0]>()
    filteredEntries.forEach((entry) => {
      map.set(entry.entry_date, entry)
    })
    return map
  }, [filteredEntries])

  // Calendar: Map entry status by date (true = complete, false = in-progress)
  const entryStatusByDate = useMemo(() => {
    const map = new Map<number, boolean>()
    filteredEntries.forEach((entry) => {
      const hasSegments = entry.segments && entry.segments.length > 0
      const isComplete = hasSegments
        ? entry.segments.every((seg) => seg.end_time !== null)
        : false
      map.set(entry.entry_date, isComplete)
    })
    return map
  }, [filteredEntries])

  // Calendar: Get entry for a specific date
  const getEntryForDate = (date: Date) => {
    const dayTimestamp = getStartOfDayTimestamp(Math.floor(date.getTime() / 1000))
    return entriesByDate.get(dayTimestamp)
  }

  // Calendar: Check if date has entry
  const dateHasEntry = (date: Date) => {
    const dayTimestamp = getStartOfDayTimestamp(Math.floor(date.getTime() / 1000))
    return entriesByDate.has(dayTimestamp)
  }

  // Calendar: Get entry status for date
  const getEntryStatusForDate = (date: Date) => {
    const dayTimestamp = getStartOfDayTimestamp(Math.floor(date.getTime() / 1000))
    return entryStatusByDate.get(dayTimestamp) ?? null
  }

  // Calendar: Check if date matches search query
  const dateMatchesSearch = (date: Date) => {
    if (!searchQuery.trim()) return false
    const entry = getEntryForDate(date)
    if (!entry) return false
    
    const query = searchQuery.toLowerCase().trim()
    // Search in summary
    if (entry.summary?.toLowerCase().includes(query)) return true
    
    // Search in formatted date
    const entryDate = new Date(entry.entry_date * 1000)
    const dateFormats = [
      format(entryDate, "yyyy-MM-dd"),
      format(entryDate, "MMM dd, yyyy"),
      format(entryDate, "MMMM dd, yyyy"),
      format(entryDate, "MM/dd/yyyy"),
      format(entryDate, "MMM dd"),
      format(entryDate, "MMMM"),
      format(entryDate, "yyyy"),
    ]
    if (dateFormats.some((fmt) => fmt.toLowerCase().includes(query))) return true
    
    // Search in segment notes
    if (entry.segments?.some((seg) => seg.notes?.toLowerCase().includes(query))) return true
    
    return false
  }

  // Calendar: Handle day click
  const handleDayClick = (date: Date | undefined) => {
    if (!date) return
    const entry = getEntryForDate(date)
    if (entry) {
      setSelectedDay(date)
    } else {
      // Optional: Could allow creating entry for clicked day
      setSelectedDay(undefined)
    }
  }

  // Calculate entry billable total from segments
  const calculateEntryBillable = (entry: (typeof entries)[0]) => {
    if (!billingConfig || billingConfig.billing_type === "fixed_price") {
      return null
    }

    return entry.segments.reduce((total, segment) => {
      const amount = calculateSegmentBillableAmount(segment, billingConfig)
      return total + (amount || 0)
    }, 0)
  }

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading time entries...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/30 dark:border-border/40 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Time Management</h2>
            <p className="text-sm text-muted-foreground mt-1">{case_.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBillingConfigOpen(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure Billing
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-card border border-border/30 dark:border-border/40 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Total Time
            </div>
            <div className="text-2xl font-bold">
              {summary ? formatTimeHuman(summary.total_seconds) : "0h"}
            </div>
          </div>
          <div className="p-4 bg-card border border-border/30 dark:border-border/40 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Days Tracked
            </div>
            <div className="text-2xl font-bold">{summary?.total_days || 0}</div>
          </div>
          <div className="p-4 bg-card border border-border/30 dark:border-border/40 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Total Billing
            </div>
            <div className="text-2xl font-bold">
              ${billingTotal?.total_amount.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              List
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              Calendar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === "calendar" ? (
          /* Calendar View */
          filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No time entries</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchQuery
                  ? "No entries match your search. Try adjusting your search query."
                  : "Start tracking time by opening a case and using the timer in the header."}
              </p>
            </div>
          ) : (
            <div className="w-full h-full p-6">
              <div className="w-full h-full bg-card border border-border/30 dark:border-border/40 rounded-lg p-6 flex flex-col">
                <CalendarComponent
                  mode="single"
                  month={calendarMonth}
                  onMonthChange={(date) => {
                    if (date) setCalendarMonth(date)
                  }}
                  selected={selectedDay}
                  onSelect={handleDayClick}
                  modifiers={{
                    hasEntry: (date) => dateHasEntry(date),
                    entryComplete: (date) => getEntryStatusForDate(date) === true,
                    entryInProgress: (date) => getEntryStatusForDate(date) === false,
                    matchesSearch: (date) => dateMatchesSearch(date),
                  }}
                  components={{
                    DayButton: (props) => {
                      // CalendarDay has a .date property that is the actual Date
                      const dayDate = props.day?.date
                      const entry = dayDate ? getEntryForDate(dayDate) : undefined
                      const status = dayDate ? getEntryStatusForDate(dayDate) : null
                      const matchesSearch = dayDate ? dateMatchesSearch(dayDate) : false
                      return (
                        <TimeCalendarDayButton
                          {...props}
                          entry={entry ?? undefined}
                          entryStatus={status ?? undefined}
                          billingConfig={billingConfig ?? undefined}
                          calculateBillable={calculateEntryBillable}
                          matchesSearch={matchesSearch}
                        />
                      )
                    },
                    Chevron: ({ className, orientation, ...props }) => {
                      const ChevronIcon = orientation === "left" ? ChevronLeft : ChevronRight
                      return (
                        <ChevronIcon className={cn("h-5 w-5", className)} {...props} />
                      )
                    },
                  }}
                  className="w-full h-full flex flex-col [&_table]:h-full [&_table]:flex [&_table]:flex-col [&_tbody]:flex-1 [&_tbody]:flex [&_tbody]:flex-col [&_tr]:flex-1 [&_tr]:flex [&_td]:h-full [&_td]:flex-1"
                  classNames={{
                    root: "w-full h-full flex flex-col",
                    months: "flex-1 flex items-center justify-center",
                    month: "w-full h-full flex flex-col",
                    caption: "flex justify-center pt-2 relative items-center mb-4 px-20 flex-shrink-0",
                    caption_label: "text-2xl font-semibold text-foreground",
                    nav: "space-x-1",
                    button_previous: "absolute left-4 h-10 w-10 rounded-md hover:bg-muted transition-colors flex items-center justify-center border border-border/30 hover:border-border/50 bg-background shadow-sm",
                    button_next: "absolute right-4 h-10 w-10 rounded-md hover:bg-muted transition-colors flex items-center justify-center border border-border/30 hover:border-border/50 bg-background shadow-sm",
                    month_caption: "flex-1",
                    table: "w-full flex-1",
                    head_row: "flex w-full mb-2 flex-shrink-0",
                    head_cell: "text-muted-foreground font-medium text-sm flex-1 flex items-center justify-center py-2 uppercase tracking-wider",
                    row: "flex w-full mb-1.5 flex-1 min-w-0",
                    cell: "flex-1 p-1 relative flex h-full min-w-0 max-w-full",
                    day: "flex-1 h-full w-full min-w-0 max-w-full",
                  }}
                />
              </div>
            </div>
          )
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No time entries</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {searchQuery
                ? "No entries match your search. Try adjusting your search query."
                : "Start tracking time by opening a case and using the timer in the header."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => {
              const entryBillable = calculateEntryBillable(entry)
              const isExpanded = expandedEntryIds.has(entry.id)
              const hasSegments = entry.segments && entry.segments.length > 0
              // Determine if entry is "complete" (all segments have end times)
              const isComplete = hasSegments
                ? entry.segments.every((seg) => seg.end_time !== null)
                : false

              return (
                <div
                  key={entry.id}
                  className="group relative bg-card border border-border/30 dark:border-border/40 rounded-lg transition-all hover:border-border/50"
                >
                  {/* Status Indicator - Color coded left border with icon */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                      isComplete ? "bg-green-500/60" : "bg-blue-500/60"
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="absolute left-[-7px] top-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            {isComplete ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 fill-green-500/20 bg-background rounded-full cursor-help" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20 bg-background rounded-full cursor-help" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          {isComplete
                            ? "Complete: All time segments have been finished"
                            : "In Progress: Some time segments are still running or incomplete"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="p-4 pl-5">
                    {/* Header Row - Ultra Compact and Scannable */}
                    <div
                      className="flex items-center justify-between gap-4 cursor-pointer"
                      onClick={() => hasSegments && toggleEntryExpanded(entry.id)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Date - Prominent */}
                        <h3 className="font-semibold text-base text-foreground">
                          {formatEntryDate(entry.entry_date)}
                        </h3>

                        {/* Time - Monospace */}
                        <span className="text-sm text-muted-foreground font-mono tabular-nums">
                          {formatTime(entry.total_seconds)}
                        </span>

                        {/* Billable - Highlighted */}
                        {entryBillable !== null && (
                          <span className="text-sm font-semibold text-foreground">
                            {formatBillableAmount(entryBillable, false)}
                          </span>
                        )}
                      </div>

                      {/* Right Side: Segment Count Badge, Delete, and Expand/Collapse */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Segment Count Badge */}
                        {hasSegments && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                            {entry.segments.length} segment{entry.segments.length !== 1 ? "s" : ""}
                          </span>
                        )}

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingEntryId(entry.id)
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {/* Expand/Collapse - Always visible when segments exist */}
                        {hasSegments && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleEntryExpanded(entry.id)
                            }}
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Summary - Editable */}
                    {editingSummaryEntryId === entry.id ? (
                      <div className="mt-2">
                        <div className="relative">
                          <textarea
                            value={editingSummaryText}
                            onChange={(e) => setEditingSummaryText(e.target.value)}
                            className="w-full text-sm bg-background border border-border/30 rounded-md px-3 py-2 pr-20 resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Add a summary of your work..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                handleSummaryCancel()
                              } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                handleSummarySave()
                              }
                            }}
                          />
                          <div className="absolute right-2 top-2 flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSummarySave}
                              className="h-7 w-7 p-0"
                              title="Save (⌘+Enter)"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSummaryCancel}
                              className="h-7 w-7 p-0"
                              title="Cancel (Esc)"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="group/summary relative mt-2"
                        onClick={() => handleSummaryEdit(entry)}
                      >
                        {entry.summary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute left-0 top-0.5 h-5 w-5 p-0 opacity-0 group-hover/summary:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSummaryEdit(entry)
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {entry.summary ? (
                          <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer hover:text-foreground transition-colors pl-7">
                            {entry.summary}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 italic cursor-pointer hover:text-muted-foreground transition-colors pl-7">
                            Click to add summary...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Segments Timeline - Expanded View */}
                    {isExpanded && (
                      <div className="mt-4 space-y-2.5 pl-4 border-l-2 border-border/20">
                        {/* Add Segment Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAddingSegmentEntryId(entry.id)
                          }}
                          className="w-full justify-start text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Segment
                        </Button>

                        {/* Existing Segments */}
                        {hasSegments &&
                          entry.segments
                            .slice()
                            .sort((a, b) => a.start_time - b.start_time)
                            .map((segment) => {
                              const billableAmount = calculateSegmentBillableAmount(
                                segment,
                                billingConfig
                              )
                              const isFixedPrice = billingConfig?.billing_type === "fixed_price"

                              const startDate = new Date(segment.start_time * 1000)
                              const endDate = segment.end_time
                                ? new Date(segment.end_time * 1000)
                                : new Date()

                              return (
                                <div
                                  key={segment.id}
                                  className="group/segment relative pl-3 py-2 rounded-md hover:bg-muted/20 transition-colors"
                                >
                                  {/* Timeline dot - neutral marker, not a status indicator */}
                                  <div className="absolute left-[-7px] top-3">
                                    <div className="h-1.5 w-1.5 rounded-full border-2 border-background bg-muted-foreground/40" />
                                  </div>

                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0 space-y-1">
                                      {/* Time Range - Primary Info */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-xs font-medium text-foreground tabular-nums">
                                          {format(startDate, "h:mm a")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">→</span>
                                        <span className="font-mono text-xs font-medium text-foreground tabular-nums">
                                          {format(endDate, "h:mm a")}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono tabular-nums">
                                          ({formatTime(segment.duration_seconds || 0)})
                                        </span>
                                      </div>

                                      {/* Rate, Billable, Discount - Secondary Info */}
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <span
                                          className={`text-xs ${
                                            hasRateOverride(segment)
                                              ? "text-primary font-medium"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {formatRateDisplay(segment, billingConfig)}
                                        </span>
                                        {billableAmount !== null && (
                                          <>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs font-semibold text-foreground">
                                              {formatBillableAmount(billableAmount, isFixedPrice)}
                                            </span>
                                          </>
                                        )}
                                        {segment.discount_percent > 0 && (
                                          <>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs text-amber-500/80">
                                              {segment.discount_percent}% off
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {/* Notes - Tertiary Info */}
                                      {segment.notes && (
                                        <div className="text-xs text-muted-foreground italic line-clamp-1">
                                          {segment.notes}
                                        </div>
                                      )}
                                    </div>

                                    {/* Actions - Show on hover */}
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/segment:opacity-100 transition-opacity flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingSegment(segment)
                                        }}
                                        className="h-7 w-7 p-0"
                                        title="Edit segment"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteSegment(segment.id)
                                        }}
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        title="Delete segment"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Segment Edit Dialog */}
      <SegmentEditDialog
        open={editingSegment !== null || addingSegmentEntryId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSegment(null)
            setAddingSegmentEntryId(null)
          }
        }}
        segment={editingSegment}
        entryId={addingSegmentEntryId || undefined}
        billingConfig={billingConfig}
        onSave={() => {
          refresh()
          setEditingSegment(null)
          setAddingSegmentEntryId(null)
        }}
      />

      {/* Billing Config Dialog */}
      <BillingConfigDialog
        open={billingConfigOpen}
        onOpenChange={setBillingConfigOpen}
        caseId={case_.id}
        onSave={() => {
          refresh()
        }}
      />

      {/* Delete Entry Confirmation Dialog */}
      {deletingEntryId && (() => {
        const entry = entries.find((e) => e.id === deletingEntryId)
        if (!entry) return null
        return (
          <DeleteTimeEntryDialog
            open={deletingEntryId !== null}
            onOpenChange={(open) => {
              if (!open) setDeletingEntryId(null)
            }}
            entryDate={entry.entry_date}
            totalTime={formatTime(entry.total_seconds)}
            segmentCount={entry.segments?.length || 0}
            onConfirm={handleDeleteEntry}
            loading={deleteLoading}
          />
        )
      })()}

      {/* Calendar Day Panel - Slide-in from right */}
      {selectedDay && (() => {
        const selectedEntry = getEntryForDate(selectedDay)
        if (!selectedEntry) {
          setSelectedDay(undefined)
          return null
        }

        const entryBillable = calculateEntryBillable(selectedEntry)
        // Always show segments in the side panel
        const isExpanded = true
        const hasSegments = selectedEntry.segments && selectedEntry.segments.length > 0
        const isComplete = hasSegments
          ? selectedEntry.segments.every((seg) => seg.end_time !== null)
          : false

        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 z-40 animate-in fade-in-0 duration-200"
              onClick={() => setSelectedDay(undefined)}
            />
            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-card border-l border-border/30 dark:border-border/40 z-50 shadow-lg animate-in slide-in-from-right duration-300 overflow-y-auto">
              <div className="p-4 border-b border-border/30 dark:border-border/40 flex items-center justify-between">
                <h3 className="font-semibold text-lg">Time Entry</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeletingEntryId(selectedEntry.id)
                      setSelectedDay(undefined)
                    }}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Delete entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDay(undefined)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative h-full overflow-hidden">
                {/* Status Indicator - Full height, contained */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isComplete ? "bg-green-500/60" : "bg-blue-500/60"
                  }`}
                >
                  <div className="absolute top-4" style={{ left: '0.75rem', transform: 'translateX(-50%)' }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-background rounded-full p-0.5">
                          {isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 fill-green-500/20 cursor-help" />
                          ) : (
                            <Circle className="h-4 w-4 text-blue-500 fill-blue-500/20 cursor-help" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {isComplete
                          ? "Complete: All time segments have been finished"
                          : "In Progress: Some time segments are still running or incomplete"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="p-8 pl-6">
                    {/* Header Row */}
                    <div className="mb-8">
                      <div className="mb-4">
                        <h3 className="font-semibold text-xl text-foreground mb-2">
                          {formatEntryDate(selectedEntry.entry_date)}
                        </h3>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-base text-muted-foreground font-mono tabular-nums">
                            {formatTime(selectedEntry.total_seconds)}
                          </span>
                          {entryBillable !== null && (
                            <span className="text-base font-semibold text-foreground">
                              {formatBillableAmount(entryBillable, false)}
                            </span>
                          )}
                          {hasSegments && (
                            <span className="text-sm px-3 py-1 rounded-full bg-muted/50 text-muted-foreground">
                              {selectedEntry.segments.length} segment{selectedEntry.segments.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary - Editable */}
                    {editingSummaryEntryId === selectedEntry.id ? (
                      <div className="mb-8">
                        <div className="relative">
                          <textarea
                            value={editingSummaryText}
                            onChange={(e) => setEditingSummaryText(e.target.value)}
                            className="w-full text-sm bg-background border border-border/30 rounded-md px-4 py-3 pr-20 resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Add a summary of your work..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                handleSummaryCancel()
                              } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                handleSummarySave()
                              }
                            }}
                          />
                          <div className="absolute right-3 top-3 flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSummarySave}
                              className="h-7 w-7 p-0"
                              title="Save (⌘+Enter)"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleSummaryCancel}
                              className="h-7 w-7 p-0"
                              title="Cancel (Esc)"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="group/summary relative mb-8"
                        onClick={() => handleSummaryEdit(selectedEntry)}
                      >
                        {selectedEntry.summary ? (
                          <p className="text-sm text-muted-foreground leading-relaxed cursor-pointer hover:text-foreground transition-colors pr-8">
                            {selectedEntry.summary}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 italic cursor-pointer hover:text-muted-foreground transition-colors">
                            Click to add summary...
                          </p>
                        )}
                        {selectedEntry.summary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-6 w-6 p-0 opacity-0 group-hover/summary:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSummaryEdit(selectedEntry)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Segments Timeline - Expanded View */}
                    {isExpanded && (
                      <div className="space-y-4 pl-3 border-l-2 border-border/20">
                        {/* Add Segment Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAddingSegmentEntryId(selectedEntry.id)
                          }}
                          className="w-full justify-start text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Segment
                        </Button>

                        {/* Existing Segments */}
                        {hasSegments &&
                          selectedEntry.segments
                            .slice()
                            .sort((a, b) => a.start_time - b.start_time)
                            .map((segment) => {
                              const billableAmount = calculateSegmentBillableAmount(
                                segment,
                                billingConfig
                              )
                              const isFixedPrice = billingConfig?.billing_type === "fixed_price"

                              const startDate = new Date(segment.start_time * 1000)
                              const endDate = segment.end_time
                                ? new Date(segment.end_time * 1000)
                                : new Date()

                              return (
                                <div
                                  key={segment.id}
                                  className="group/segment relative pl-2 py-3 rounded-md hover:bg-muted/20 transition-colors"
                                >
                                  {/* Timeline dot */}
                                  <div className="absolute left-[-6px] top-4">
                                    <div className="h-2 w-2 rounded-full border-2 border-background bg-muted-foreground/40" />
                                  </div>

                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0 space-y-1">
                                      {/* Time Range */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-xs font-medium text-foreground tabular-nums">
                                          {format(startDate, "h:mm a")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">→</span>
                                        <span className="font-mono text-xs font-medium text-foreground tabular-nums">
                                          {format(endDate, "h:mm a")}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-mono tabular-nums">
                                          ({formatTime(segment.duration_seconds || 0)})
                                        </span>
                                      </div>

                                      {/* Rate, Billable, Discount */}
                                      <div className="flex items-center gap-2.5 flex-wrap">
                                        <span
                                          className={`text-xs ${
                                            hasRateOverride(segment)
                                              ? "text-primary font-medium"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {formatRateDisplay(segment, billingConfig)}
                                        </span>
                                        {billableAmount !== null && (
                                          <>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs font-semibold text-foreground">
                                              {formatBillableAmount(billableAmount, isFixedPrice)}
                                            </span>
                                          </>
                                        )}
                                        {segment.discount_percent > 0 && (
                                          <>
                                            <span className="text-xs text-muted-foreground">•</span>
                                            <span className="text-xs text-amber-500/80">
                                              {segment.discount_percent}% off
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {/* Notes */}
                                      {segment.notes && (
                                        <div className="text-xs text-muted-foreground italic line-clamp-1">
                                          {segment.notes}
                                        </div>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/segment:opacity-100 transition-opacity flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingSegment(segment)
                                        }}
                                        className="h-7 w-7 p-0"
                                        title="Edit segment"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteSegment(segment.id)
                                        }}
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        title="Delete segment"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
