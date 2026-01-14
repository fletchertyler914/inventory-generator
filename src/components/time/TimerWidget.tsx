/**
 * TimerWidget Component
 *
 * ELITE: Subtle, minimal timer widget for case header
 * - Compact display with elapsed time (HH:MM:SS)
 * - Play/Pause/Stop controls (minimal, icon-only)
 * - Visual indicator when running (subtle pulse animation)
 * - Auto-updates smoothly (60fps via requestAnimationFrame)
 * - Non-intrusive design matching header aesthetic
 */

import { useState, useEffect } from "react"
import { Play, Pause, Square } from "lucide-react"
import { Button } from "../ui/button"
import { useTimer } from "@/hooks/useTimer"
import { DailySummaryDialog } from "./DailySummaryDialog"
import { timeService } from "@/services/timeService"
import { cn } from "@/lib/utils"

interface TimerWidgetProps {
  caseId: string
  onStop?: () => void
  className?: string
}

export function TimerWidget({ caseId, onStop, className }: TimerWidgetProps) {
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  // Force refresh by changing the caseId passed to useTimer when refreshKey changes
  // Extract base caseId (remove any refresh suffix that might be there)
  const baseCaseId: string = caseId.split("-refresh-")[0] || caseId
  const timerCaseId = refreshKey > 0 ? `${baseCaseId}-refresh-${refreshKey}` : baseCaseId

  const {
    isRunning,
    isPaused,
    formattedTime,
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
    loading,
  } = useTimer({
    caseId: timerCaseId, // Pass modified caseId to force reload when refreshKey changes
    enabled: true,
    onTimerStop: async () => {
      // Get the actual total seconds from the entry
      try {
        const { getStartOfDayTimestamp } = await import("@/lib/time-utils")
        const today = getStartOfDayTimestamp(Date.now() / 1000)
        const entry = await timeService.getTimeEntry(baseCaseId, today)
        if (entry) {
          setTotalSeconds(entry.total_seconds)
        } else {
          setTotalSeconds(elapsedSeconds)
        }
      } catch {
        setTotalSeconds(elapsedSeconds)
      }
      setShowSummaryDialog(true)
      onStop?.()
    },
  })

  // Enhanced start function
  const handleStart = async () => {
    await start()
  }

  // Listen for timer start events from outside (like the confirmation dialog)
  // ELITE: Event-driven instead of polling for better performance
  useEffect(() => {
    const handleTimerStarted = (event: CustomEvent) => {
      if (event.detail?.caseId === baseCaseId) {
        // Timer was started externally, force refresh
        setRefreshKey((prev) => prev + 1)
      }
    }

    // Listen for custom timer-started event (event-driven, no polling)
    window.addEventListener("timer-started", handleTimerStarted as EventListener)

    return () => {
      window.removeEventListener("timer-started", handleTimerStarted as EventListener)
    }
  }, [baseCaseId])

  const handleStop = () => {
    // Stop will trigger onTimerStop callback which shows the dialog
    stop()
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-md bg-card/50",
        isRunning && "animate-pulse",
        className
      )}
    >
      {/* Timer Display */}
      <span
        className={cn(
          "text-sm font-mono tabular-nums min-w-[80px] text-center",
          isRunning ? "text-primary" : "text-muted-foreground"
        )}
      >
        {formattedTime}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStart}
            disabled={loading}
            className="h-7 w-7 p-0"
            title="Start timer"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        ) : isPaused ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={resume}
            disabled={loading}
            className="h-7 w-7 p-0"
            title="Resume timer"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={pause}
            disabled={loading}
            className="h-7 w-7 p-0"
            title="Pause timer"
          >
            <Pause className="h-3.5 w-3.5" />
          </Button>
        )}

        {isRunning && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStop}
            disabled={loading}
            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
            title="Stop timer"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Daily Summary Dialog */}
      <DailySummaryDialog
        open={showSummaryDialog}
        onOpenChange={setShowSummaryDialog}
        caseId={baseCaseId}
        totalSeconds={totalSeconds}
        onSave={() => {
          setShowSummaryDialog(false)
          setTotalSeconds(0)
        }}
      />
    </div>
  )
}
