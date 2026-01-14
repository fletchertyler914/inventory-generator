/**
 * DailySummaryDialog Component
 *
 * ELITE: Dialog that appears when timer is stopped
 * - Text area for daily summary/notes
 * - Shows total time for the day
 * - Preview of billable amount (if pay_rate)
 * - Save/Cancel buttons
 * - Auto-focus on text area
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { Label } from "../ui/label"
import { timeService } from "@/services/timeService"
import type { BillingConfig } from "@/types/timeTracking"
import { formatTime, getStartOfDayTimestamp } from "@/lib/time-utils"
import { toast } from "@/hooks/useToast"

interface DailySummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseId: string
  totalSeconds: number
  onSave?: () => void
}

export function DailySummaryDialog({
  open,
  onOpenChange,
  caseId,
  totalSeconds,
  onSave,
}: DailySummaryDialogProps) {
  const [summary, setSummary] = useState("")
  const [loading, setLoading] = useState(false)
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null)
  const [billingAmount, setBillingAmount] = useState<number | null>(null)
  const [entryId, setEntryId] = useState<string | null>(null)

  // Load billing config and entry when dialog opens
  useEffect(() => {
    if (open && caseId) {
      // Load billing config and entry in parallel
      const today = getStartOfDayTimestamp(Date.now() / 1000)

      Promise.all([
        timeService.getCaseBillingConfig(caseId),
        timeService.getTimeEntry(caseId, today),
      ])
        .then(([config, entry]) => {
          setBillingConfig(config)

          if (entry) {
            setEntryId(entry.id)
            // Load existing summary if present
            setSummary(entry.summary || "")

            // Calculate billing using backend (handles all rate units and discounts correctly)
            if (config?.billing_type === "pay_rate") {
              timeService
                .calculateBillingAmount(caseId, entry.id)
                .then((amount) => {
                  setBillingAmount(amount)
                })
                .catch(() => {
                  // Fallback to null if calculation fails
                  setBillingAmount(null)
                })
            } else if (config?.billing_type === "fixed_price" && config.fixed_price) {
              setBillingAmount(config.fixed_price)
            } else {
              setBillingAmount(null)
            }
          } else {
            setBillingAmount(null)
            setSummary("")
          }
        })
        .catch(() => {
          // Reset on error
          setBillingConfig(null)
          setBillingAmount(null)
          setEntryId(null)
        })
    } else {
      // Reset when dialog closes
      setBillingConfig(null)
      setBillingAmount(null)
      setEntryId(null)
      setSummary("")
    }
  }, [open, caseId])

  const handleSave = async () => {
    setLoading(true)
    try {
      // Timer is already stopped, just update the entry with summary
      const today = getStartOfDayTimestamp(Date.now() / 1000)
      const entry = await timeService.getTimeEntry(caseId, today)
      if (entry) {
        await timeService.updateTimeEntry(entry.id, { summary: summary || undefined })
      }
      toast({
        title: "Summary saved",
        description: "Your daily summary has been saved.",
      })
      onSave?.()
      onOpenChange(false)
      setSummary("")
    } catch (error) {
      toast({
        title: "Failed to save summary",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSummary("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Daily Summary</DialogTitle>
          <DialogDescription>
            Add a summary of your work for today. This will be used for billing and reporting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Time Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground">Total Time:</span>
            <span className="text-sm font-mono font-semibold">{formatTime(totalSeconds)}</span>
          </div>

          {/* Billing Preview */}
          {billingAmount !== null && billingConfig && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <span className="text-sm text-muted-foreground">Billable Amount:</span>
              <span className="text-sm font-semibold">
                ${billingAmount.toFixed(2)}
                {billingConfig.billing_type === "pay_rate" && billingConfig.rate_unit && (
                  <span className="text-muted-foreground ml-1">({billingConfig.rate_unit})</span>
                )}
              </span>
            </div>
          )}

          {/* Summary Input */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              placeholder="Describe what you accomplished today..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[120px] resize-none"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
