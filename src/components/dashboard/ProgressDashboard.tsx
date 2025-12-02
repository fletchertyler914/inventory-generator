import { useMemo } from 'react';
import { Progress } from '../ui/progress';
import type { InventoryItem } from '@/types/inventory';

interface ProgressDashboardProps {
  items: InventoryItem[];
}

export function ProgressDashboard({ items }: ProgressDashboardProps) {
  const stats = useMemo(() => {
    const total = items.length;
    const unreviewed = items.filter(item => !item.status || item.status === 'unreviewed').length;
    const inProgress = items.filter(item => item.status === 'in_progress').length;
    const reviewed = items.filter(item => item.status === 'reviewed').length;
    const finalized = items.filter(item => item.status === 'finalized').length;
    
    const reviewedCount = reviewed + finalized;
    const progressPercentage = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;
    
    return {
      total,
      unreviewed,
      inProgress,
      reviewed,
      finalized,
      reviewedCount,
      progressPercentage,
      remaining: unreviewed + inProgress,
    };
  }, [items]);

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 py-2 px-1">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground font-medium">Review Progress</span>
          <span className="font-semibold text-foreground">{stats.progressPercentage}%</span>
        </div>
        <Progress value={stats.progressPercentage} className="h-1.5" />
      </div>
      <div className="flex items-center gap-4 text-xs flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Remaining:</span>
          <span className="font-semibold">{stats.remaining}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Completed:</span>
          <span className="font-semibold text-success">{stats.reviewedCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold">{stats.total}</span>
        </div>
      </div>
    </div>
  );
}

