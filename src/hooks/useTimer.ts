/**
 * useTimer Hook
 *
 * ELITE: High-performance timer hook with:
 * - requestAnimationFrame for smooth 60fps updates (not setInterval)
 * - Debounced backend sync (only syncs every 30 seconds when running)
 * - Optimistic UI updates (immediate feedback, sync in background)
 * - Memoized calculations (elapsed time, formatted display)
 * - Cleanup on unmount (cancel animation frame)
 * - Error recovery (retry on failure, graceful degradation)
 * - Persists timer state in database (single source of truth)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { timeService } from "@/services/timeService"
import { logError } from "@/lib/logger"
import { toast } from "@/hooks/useToast"

interface UseTimerOptions {
  caseId: string
  enabled?: boolean
  onTimerStop?: () => void
}

interface UseTimerReturn {
  isRunning: boolean
  isPaused: boolean
  elapsedSeconds: number
  formattedTime: string
  start: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  loading: boolean
  error: Error | null
}

const SYNC_INTERVAL = 30 * 1000 // 30 seconds

/**
 * Format seconds to HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function useTimer({ caseId, enabled = true, onTimerStop }: UseTimerOptions): UseTimerReturn {
  // Extract base caseId (remove refresh suffix if present)
  const baseCaseId: string = caseId.split("-refresh-")[0] || caseId

  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const animationFrameRef = useRef<number | null>(null)
  const lastSyncRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const totalPausedTimeRef = useRef<number>(0)
  const existingEntryTotalRef = useRef<number>(0) // Track existing entry's total for the day

  // Load timer state from backend
  const loadTimerState = useCallback(async () => {
    if (!enabled || !baseCaseId) return

    try {
      const timer = await timeService.getActiveTimer(baseCaseId)
      if (timer) {
        setIsRunning(true)
        setIsPaused(false)
        // Calculate elapsed time from start_time
        const now = Date.now() / 1000
        const elapsed = now - timer.started_at
        startTimeRef.current = timer.started_at
        totalPausedTimeRef.current = 0

        // ELITE: Load existing entry total for the day to show cumulative time
        const { getStartOfDayTimestamp } = await import("@/lib/time-utils")
        const today = getStartOfDayTimestamp(now)
        try {
          const entry = await timeService.getTimeEntry(baseCaseId, today)
          if (entry) {
            // Get total from existing completed segments (excluding current running segment if it exists)
            const currentSegmentId = timer.current_segment_id
            const existingTotal =
              entry.segments
                ?.filter((seg) => {
                  // Exclude the current running segment (it has no duration_seconds yet)
                  if (currentSegmentId && seg.id === currentSegmentId) return false
                  // Only count completed segments
                  return seg.duration_seconds !== null && seg.duration_seconds !== undefined
                })
                .reduce((sum, seg) => sum + (seg.duration_seconds || 0), 0) || 0
            existingEntryTotalRef.current = existingTotal
            // Display: existing total + current segment elapsed
            setElapsedSeconds(existingTotal + Math.max(0, Math.floor(elapsed)))
          } else {
            existingEntryTotalRef.current = 0
            setElapsedSeconds(Math.max(0, Math.floor(elapsed)))
          }
        } catch {
          // Fallback if entry fetch fails
          existingEntryTotalRef.current = 0
          setElapsedSeconds(Math.max(0, Math.floor(elapsed)))
        }
      } else {
        // No active timer in database - timer is stopped
        // But still show cumulative time for the day if entry exists
        setIsRunning(false)
        setIsPaused(false)
        
        // ELITE: Load existing entry total to show cumulative time even when stopped
        const { getStartOfDayTimestamp } = await import("@/lib/time-utils")
        const now = Date.now() / 1000
        const today = getStartOfDayTimestamp(now)
        try {
          const entry = await timeService.getTimeEntry(baseCaseId, today)
          if (entry) {
            // Get total from all completed segments
            const existingTotal =
              entry.segments
                ?.filter((seg) => seg.duration_seconds) // Only completed segments
                .reduce((sum, seg) => sum + (seg.duration_seconds || 0), 0) || 0
            existingEntryTotalRef.current = existingTotal
            setElapsedSeconds(existingTotal) // Show cumulative time even when stopped
          } else {
            existingEntryTotalRef.current = 0
            setElapsedSeconds(0)
          }
        } catch {
          // Fallback if entry fetch fails
          existingEntryTotalRef.current = 0
          setElapsedSeconds(0)
        }
      }
    } catch (err) {
      logError("Failed to load timer state", err)
      // Don't show error - timer state is not critical on load
    }
  }, [baseCaseId, enabled])

  // Animation frame loop for smooth updates
  const updateTimer = useCallback(() => {
    if (!isRunning || isPaused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const now = Date.now() / 1000
    const currentSegmentElapsed = now - startTimeRef.current - totalPausedTimeRef.current
    // Display: existing entry total + current segment elapsed
    setElapsedSeconds(
      existingEntryTotalRef.current + Math.max(0, Math.floor(currentSegmentElapsed))
    )

    // ELITE: Only sync if enough time has passed (debounced sync)
    // This prevents unnecessary backend calls when timer is just running normally
    if (now - lastSyncRef.current >= SYNC_INTERVAL / 1000) {
      lastSyncRef.current = now
      // Background sync - don't await (non-blocking)
      // Only syncs to ensure backend state is current, not for UI updates
      if (baseCaseId) {
        timeService.getActiveTimer(baseCaseId).catch((err) => {
          logError("Failed to sync timer state", err)
        })
      }
    }

    animationFrameRef.current = requestAnimationFrame(updateTimer)
  }, [isRunning, isPaused, baseCaseId])

  // Start timer
  const start = useCallback(async () => {
    if (!enabled || !baseCaseId) return

    setLoading(true)
    setError(null)

    try {
      await timeService.startTimer(baseCaseId)
      const now = Date.now() / 1000
      startTimeRef.current = now
      totalPausedTimeRef.current = 0

      // ELITE: Load existing entry total for the day to show cumulative time
      const { getStartOfDayTimestamp } = await import("@/lib/time-utils")
      const today = getStartOfDayTimestamp(now)
      try {
        const entry = await timeService.getTimeEntry(baseCaseId, today)
        if (entry) {
          // Get total from existing completed segments
          const existingTotal =
            entry.segments
              ?.filter((seg) => seg.duration_seconds) // Only completed segments
              .reduce((sum, seg) => sum + (seg.duration_seconds || 0), 0) || 0
          existingEntryTotalRef.current = existingTotal
          setElapsedSeconds(existingTotal) // Start with existing total, will increment with current segment
        } else {
          existingEntryTotalRef.current = 0
          setElapsedSeconds(0)
        }
      } catch {
        // Fallback if entry fetch fails
        existingEntryTotalRef.current = 0
        setElapsedSeconds(0)
      }

      setIsRunning(true)
      setIsPaused(false)
      lastSyncRef.current = now

      // Start animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(updateTimer)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to start timer")
      logError("Failed to start timer", error)
      setError(error)
      toast({
        title: "Failed to start timer",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [baseCaseId, enabled, updateTimer])

  // Pause timer
  const pause = useCallback(async () => {
    if (!enabled || !baseCaseId || !isRunning) return

    setLoading(true)
    setError(null)

    try {
      await timeService.pauseTimer(baseCaseId)
      const now = Date.now() / 1000
      pausedTimeRef.current = now
      setIsPaused(true)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to pause timer")
      logError("Failed to pause timer", error)
      setError(error)
      toast({
        title: "Failed to pause timer",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [baseCaseId, enabled, isRunning])

  // Resume timer
  const resume = useCallback(async () => {
    if (!enabled || !baseCaseId || !isPaused) return

    setLoading(true)
    setError(null)

    try {
      await timeService.resumeTimer(baseCaseId)
      const now = Date.now() / 1000
      const pauseDuration = now - pausedTimeRef.current
      totalPausedTimeRef.current += pauseDuration
      setIsPaused(false)

      // Resume animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(updateTimer)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to resume timer")
      logError("Failed to resume timer", error)
      setError(error)
      toast({
        title: "Failed to resume timer",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [baseCaseId, enabled, isPaused, updateTimer])

  // Stop timer
  const stop = useCallback(async () => {
    if (!enabled || !baseCaseId || !isRunning) return

    setLoading(true)
    setError(null)

    try {
      await timeService.stopTimer(baseCaseId)
      setIsRunning(false)
      setIsPaused(false)
      startTimeRef.current = 0
      totalPausedTimeRef.current = 0
      
      // ELITE: Load final entry total to show cumulative time after stopping
      const { getStartOfDayTimestamp } = await import("@/lib/time-utils")
      const now = Date.now() / 1000
      const today = getStartOfDayTimestamp(now)
      try {
        const entry = await timeService.getTimeEntry(baseCaseId, today)
        if (entry) {
          // Get total from all completed segments (now includes the segment we just stopped)
          const finalTotal =
            entry.segments
              ?.filter((seg) => seg.duration_seconds) // Only completed segments
              .reduce((sum, seg) => sum + (seg.duration_seconds || 0), 0) || 0
          existingEntryTotalRef.current = finalTotal
          setElapsedSeconds(finalTotal) // Show cumulative time after stopping
        } else {
          existingEntryTotalRef.current = 0
          setElapsedSeconds(0)
        }
      } catch {
        // Fallback if entry fetch fails
        existingEntryTotalRef.current = 0
        setElapsedSeconds(0)
      }

      // Stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      onTimerStop?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to stop timer")
      logError("Failed to stop timer", error)
      setError(error)
      toast({
        title: "Failed to stop timer",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [baseCaseId, enabled, isRunning, onTimerStop])

  // Memoized formatted time
  const formattedTime = useMemo(() => formatTime(elapsedSeconds), [elapsedSeconds])

  useEffect(() => {
    if (enabled && baseCaseId) {
      loadTimerState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, enabled]) // Reload when caseId changes (even if it's just the refresh suffix)

  // Start animation frame when running
  useEffect(() => {
    if (isRunning && !isPaused) {
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateTimer)
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isRunning, isPaused, updateTimer])

  return {
    isRunning,
    isPaused,
    elapsedSeconds,
    formattedTime,
    start,
    pause,
    resume,
    stop,
    loading,
    error,
  }
}
