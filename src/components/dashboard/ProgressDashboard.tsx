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
    <div className="flex items-center gap-6">
      {/* Progress Bar Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Review Progress</span>
          <span className="font-medium text-foreground">{stats.progressPercentage}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
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

      {/* Stats Section */}
      <div className="flex items-center gap-3 text-xs flex-shrink-0">
        <div className="text-right">
          <div className="text-muted-foreground text-[10px] leading-tight">Remaining</div>
          <div className="font-semibold text-foreground leading-tight">{stats.remaining}</div>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="text-right">
          <div className="text-muted-foreground text-[10px] leading-tight">Completed</div>
          <div className="font-semibold text-green-500 leading-tight">{stats.completedCount}</div>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="text-right">
          <div className="text-muted-foreground text-[10px] leading-tight">Total</div>
          <div className="font-semibold text-foreground leading-tight">{stats.total}</div>
        </div>
      </div>
    </div>
  )
}
