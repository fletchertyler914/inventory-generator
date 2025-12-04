import { useMemo } from "react"
import type { InventoryItem } from "@/types/inventory"

interface ProgressDashboardProps {
  items: InventoryItem[]
}

export function ProgressDashboard({ items }: ProgressDashboardProps) {
  const stats = useMemo(() => {
    const total = items.length
    const unreviewed = items.filter((item) => !item.status || item.status === "unreviewed").length
    const inProgress = items.filter((item) => item.status === "in_progress").length
    const reviewed = items.filter((item) => item.status === "reviewed").length
    const finalized = items.filter((item) => item.status === "finalized").length
    const flagged = items.filter((item) => item.status === "flagged").length

    const completedCount = finalized
    const remainingCount = unreviewed + inProgress + reviewed + flagged
    const progressPercentage = total > 0 ? Math.round((completedCount / total) * 100) : 0

    // Calculate percentages for each status
    const unreviewedPercent = total > 0 ? (unreviewed / total) * 100 : 0
    const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0
    const reviewedPercent = total > 0 ? (reviewed / total) * 100 : 0
    const finalizedPercent = total > 0 ? (finalized / total) * 100 : 0
    const flaggedPercent = total > 0 ? (flagged / total) * 100 : 0

    return {
      total,
      unreviewed,
      inProgress,
      reviewed,
      finalized,
      flagged,
      completedCount,
      remainingCount,
      progressPercentage,
      remaining: remainingCount,
      unreviewedPercent,
      inProgressPercent,
      reviewedPercent,
      finalizedPercent,
      flaggedPercent,
    }
  }, [items])

  if (stats.total === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-4 py-2 px-1">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground font-medium">Review Progress</span>
          <span className="font-semibold text-foreground">{stats.progressPercentage}%</span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/20">
          {/* Segmented progress bar */}
          <div className="absolute inset-0 flex">
            {/* Unreviewed - gray */}
            {stats.unreviewedPercent > 0 && (
              <div
                className="bg-muted-foreground/40"
                style={{ width: `${stats.unreviewedPercent}%` }}
              />
            )}
            {/* In Progress - blue */}
            {stats.inProgressPercent > 0 && (
              <div className="bg-blue-400" style={{ width: `${stats.inProgressPercent}%` }} />
            )}
            {/* Reviewed - green */}
            {stats.reviewedPercent > 0 && (
              <div className="bg-green-400" style={{ width: `${stats.reviewedPercent}%` }} />
            )}
            {/* Flagged - yellow */}
            {stats.flaggedPercent > 0 && (
              <div className="bg-yellow-400" style={{ width: `${stats.flaggedPercent}%` }} />
            )}
            {/* Finalized - emerald/teal */}
            {stats.finalizedPercent > 0 && (
              <div className="bg-emerald-500" style={{ width: `${stats.finalizedPercent}%` }} />
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Remaining:</span>
          <span className="font-semibold">{stats.remaining}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Completed:</span>
          <span className="font-semibold text-success">{stats.completedCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold">{stats.total}</span>
        </div>
      </div>
    </div>
  )
}
