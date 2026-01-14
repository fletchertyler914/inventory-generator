/**
 * SegmentEditDialog Component
 *
 * ELITE: Minimal, intuitive dialog for editing time segments
 * - Clean, condensed layout matching BillingConfigDialog
 * - Real-time billable amount calculation
 * - Professional date/time pickers
 */

import { useState, useEffect, useMemo } from "react"
import { Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar as CalendarComponent } from "../ui/calendar"
import { timeService } from "@/services/timeService"
import type { TimeSegment, BillingConfig } from "@/types/timeTracking"
import {
  calculateSegmentBillableAmount,
  formatBillableAmount,
  getEffectiveRate,
} from "@/lib/billing-utils"
import { formatTime } from "@/lib/time-utils"
import { format } from "date-fns"
import { toast } from "@/hooks/useToast"

interface SegmentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: TimeSegment | null
  entryId?: string // Required when creating new segment
  billingConfig: BillingConfig | null
  onSave?: () => void
}

export function SegmentEditDialog({
  open,
  onOpenChange,
  segment,
  entryId,
  billingConfig,
  onSave,
}: SegmentEditDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState<string>("")
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [endTime, setEndTime] = useState<string>("")
  const [rateOverride, setRateOverride] = useState<string>("")
  const [discountPercent, setDiscountPercent] = useState<string>("0")
  const [notes, setNotes] = useState<string>("")
  const [loading, setLoading] = useState(false)

  // Initialize form when segment changes or dialog opens
  useEffect(() => {
    if (open) {
      if (segment) {
        // Editing existing segment
        const start = new Date(segment.start_time * 1000)
        const end = segment.end_time ? new Date(segment.end_time * 1000) : new Date()

        setStartDate(start)
        setStartTime(format(start, "HH:mm"))
        setEndDate(end)
        setEndTime(format(end, "HH:mm"))
        setRateOverride(
          segment.rate_override !== undefined && segment.rate_override !== null
            ? segment.rate_override.toString()
            : ""
        )
        setDiscountPercent(segment.discount_percent.toString())
        setNotes(segment.notes || "")
      } else {
        // Creating new segment - initialize with current date/time
        const now = new Date()
        setStartDate(now)
        setStartTime(format(now, "HH:mm"))
        setEndDate(now)
        setEndTime(format(now, "HH:mm"))
        setRateOverride("")
        setDiscountPercent("0")
        setNotes("")
      }
    }
  }, [segment, open])

  // Calculate timestamps from date + time
  const startTimestamp = useMemo(() => {
    if (!startDate || !startTime) return null
    const [hours, minutes] = startTime.split(":").map(Number)
    if (isNaN(hours) || isNaN(minutes)) return null
    const date = new Date(startDate)
    date.setHours(hours, minutes, 0, 0)
    return Math.floor(date.getTime() / 1000)
  }, [startDate, startTime])

  const endTimestamp = useMemo(() => {
    if (!endDate || !endTime) return null
    const [hours, minutes] = endTime.split(":").map(Number)
    if (isNaN(hours) || isNaN(minutes)) return null
    const date = new Date(endDate)
    date.setHours(hours, minutes, 0, 0)
    return Math.floor(date.getTime() / 1000)
  }, [endDate, endTime])

  // Calculate duration
  const durationSeconds = useMemo(() => {
    if (!startTimestamp || !endTimestamp || endTimestamp <= startTimestamp) return 0
    return endTimestamp - startTimestamp
  }, [startTimestamp, endTimestamp])

  // Create temporary segment for billable calculation
  const tempSegment: TimeSegment | null = useMemo(() => {
    if (!segment || !startTimestamp || !endTimestamp) return null

    return {
      ...segment,
      start_time: startTimestamp,
      end_time: endTimestamp,
      duration_seconds: durationSeconds > 0 ? durationSeconds : null,
      rate_override:
        rateOverride.trim() && !isNaN(parseFloat(rateOverride)) && parseFloat(rateOverride) >= 0
          ? parseFloat(rateOverride)
          : undefined,
      discount_percent: parseFloat(discountPercent) || 0,
      notes: notes.trim() || undefined,
    }
  }, [segment, startTimestamp, endTimestamp, durationSeconds, rateOverride, discountPercent, notes])

  // Calculate billable amount (real-time)
  const billableAmount = useMemo(() => {
    if (!tempSegment || !billingConfig || durationSeconds <= 0) return null
    return calculateSegmentBillableAmount(tempSegment, billingConfig)
  }, [tempSegment, billingConfig, durationSeconds])

  const defaultRate = billingConfig?.pay_rate
  const isFixedPrice = billingConfig?.billing_type === "fixed_price"
  const hasRateOverride = rateOverride.trim() && !isNaN(parseFloat(rateOverride))

  const handleSave = async () => {

    // Validation
    if (!startDate || !startTime || !endDate || !endTime) {
      toast({
        title: "Invalid times",
        description: "Start and end date/time are required",
        variant: "destructive",
      })
      return
    }

    if (!startTimestamp || !endTimestamp || endTimestamp <= startTimestamp) {
      toast({
        title: "Invalid times",
        description: "End time must be after start time",
        variant: "destructive",
      })
      return
    }

    const discount = parseFloat(discountPercent)
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast({
        title: "Invalid discount",
        description: "Discount must be between 0 and 100",
        variant: "destructive",
      })
      return
    }

    if (hasRateOverride) {
      const rate = parseFloat(rateOverride)
      if (isNaN(rate) || rate < 0) {
        toast({
          title: "Invalid rate",
          description: "Rate must be a positive number",
          variant: "destructive",
        })
        return
      }
    }

    setLoading(true)
    try {
      if (segment) {
        // Update existing segment
        const updates: Partial<TimeSegment> = {
          start_time: startTimestamp!,
          end_time: endTimestamp!,
          discount_percent: discount,
          notes: notes.trim() || undefined,
          rate_override: hasRateOverride ? parseFloat(rateOverride) : undefined,
        }

        await timeService.updateTimeSegment(segment.id, updates)
        toast({
          title: "Segment updated",
          description: "Time segment has been updated successfully.",
        })
      } else if (entryId) {
        // Create new segment
        await timeService.createTimeSegment(
          entryId,
          startTimestamp!,
          endTimestamp!,
          hasRateOverride ? parseFloat(rateOverride) : undefined,
          discount > 0 ? discount : undefined,
          notes.trim() || undefined
        )
        toast({
          title: "Segment created",
          description: "Time segment has been created successfully.",
        })
      }
      onSave?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: segment ? "Failed to update segment" : "Failed to create segment",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isCreating = !segment
  if (isCreating && !entryId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isCreating ? "Add Time Segment" : "Edit Time Segment"}</DialogTitle>
          <DialogDescription>
            {isCreating
              ? "Add a new time segment to this day"
              : "Update segment details and billing information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Time Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Start */}
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm">
                  Start
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  id="start_time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* End */}
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-sm">
                  End
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  id="end_time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Duration - Always visible to prevent layout shift */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md border border-border/20">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className={`font-mono font-semibold text-sm ${durationSeconds > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                {durationSeconds > 0 ? formatTime(durationSeconds) : "00:00:00"}
              </span>
            </div>
          </div>

          {/* Billing Section */}
          {!isFixedPrice && defaultRate !== undefined && defaultRate !== null && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Override Rate */}
                <div className="space-y-2">
                  <Label htmlFor="rate_override" className="text-sm">
                    Override Rate
                  </Label>
                  <Input
                    id="rate_override"
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateOverride}
                    onChange={(e) => setRateOverride(e.target.value)}
                    placeholder={defaultRate.toFixed(2)}
                    className="h-9"
                  />
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <Label htmlFor="discount" className="text-sm">
                    Discount
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0 (%)"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {isFixedPrice && (
            <div className="px-3 py-2 bg-muted/30 rounded-md border border-border/20">
              <div className="text-sm text-muted-foreground">
                Fixed price case — time tracked for reporting only
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this time segment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Billable Amount Preview */}
          {billableAmount !== null && durationSeconds > 0 && (
            <div className="px-4 py-3 bg-primary/5 border border-primary/20 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Billable Amount</span>
                <span className="text-lg font-bold">{formatBillableAmount(billableAmount, false)}</span>
              </div>
              {parseFloat(discountPercent) > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {parseFloat(discountPercent)}% discount applied
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || durationSeconds <= 0}>
            {loading ? (isCreating ? "Creating..." : "Saving...") : isCreating ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
