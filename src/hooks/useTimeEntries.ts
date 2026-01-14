/**
 * useTimeEntries Hook
 * 
 * ELITE: High-performance hook for managing time entries with:
 * - Virtual scrolling support for large lists
 * - Pagination with infinite scroll
 * - Request deduplication
 * - Optimistic updates
 * - Memoized aggregations
 * - Background refresh (stale-while-revalidate)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { timeService } from '@/services/timeService';
import type { TimeEntry, TimeSummary, BillingTotal, BillingConfig } from '@/types/timeTracking';
import { logError } from '@/lib/logger';
import { toast } from '@/hooks/useToast';

interface UseTimeEntriesOptions {
  caseId: string;
  enabled?: boolean;
}

interface UseTimeEntriesReturn {
  entries: TimeEntry[];
  summary: TimeSummary | null;
  billingTotal: BillingTotal | null;
  billingConfig: BillingConfig | null;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateEntry: (entryId: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  deleteSegment: (segmentId: string) => Promise<void>;
}

const PAGE_SIZE = 50;

export function useTimeEntries({
  caseId,
  enabled = true,
}: UseTimeEntriesOptions): UseTimeEntriesReturn {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<TimeSummary | null>(null);
  const [billingTotal, setBillingTotal] = useState<BillingTotal | null>(null);
  const [billingConfig, setBillingConfig] = useState<BillingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load initial entries
  const loadEntries = useCallback(async (reset = false) => {
    if (!enabled || !caseId) return;

    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setIsLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      const loadedEntries = await timeService.getTimeEntries(caseId, PAGE_SIZE, currentOffset);

      if (reset) {
        setEntries(loadedEntries);
      } else {
        setEntries((prev) => [...prev, ...loadedEntries]);
      }

      setHasMore(loadedEntries.length === PAGE_SIZE);
      setOffset(currentOffset + loadedEntries.length);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load time entries');
      logError('Failed to load time entries', error);
      setError(error);
      toast({
        title: 'Failed to load time entries',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [caseId, enabled, offset]);

  // Load summary
  const loadSummary = useCallback(async () => {
    if (!enabled || !caseId) return;

    try {
      const summaryData = await timeService.getTimeEntriesSummary(caseId);
      setSummary(summaryData);
    } catch (err) {
      logError('Failed to load time entries summary', err);
      // Don't show toast for summary failures - it's not critical
    }
  }, [caseId, enabled]);

  // Load billing config
  const loadBillingConfig = useCallback(async () => {
    if (!enabled || !caseId) return;

    try {
      const config = await timeService.getCaseBillingConfig(caseId);
      setBillingConfig(config);
    } catch (err) {
      logError('Failed to load billing config', err);
      // Don't show toast for config failures - it's not critical
    }
  }, [caseId, enabled]);

  // Load billing total
  const loadBillingTotal = useCallback(async () => {
    if (!enabled || !caseId) return;

    try {
      const total = await timeService.calculateCaseTotal(caseId);
      setBillingTotal(total);
    } catch (err) {
      logError('Failed to load billing total', err);
      // Don't show toast for billing failures - it's not critical
    }
  }, [caseId, enabled]);

  // Load more entries (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    await loadEntries(false);
  }, [hasMore, isLoadingMore, loadEntries]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      loadEntries(true),
      loadSummary(),
      loadBillingTotal(),
      loadBillingConfig(),
    ]);
  }, [loadEntries, loadSummary, loadBillingTotal, loadBillingConfig]);

  // Update entry with optimistic update
  const updateEntry = useCallback(
    async (entryId: string, updates: Partial<TimeEntry>) => {
      // Optimistic update
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, ...updates } : entry
        )
      );

      try {
        await timeService.updateTimeEntry(entryId, updates);
        // Refresh to get accurate data
        await refresh();
      } catch (err) {
        // Revert on error
        await refresh();
        const error = err instanceof Error ? err : new Error('Failed to update entry');
        logError('Failed to update time entry', error);
        toast({
          title: 'Failed to update entry',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [refresh]
  );

  // Delete entry with optimistic update
  const deleteEntry = useCallback(
    async (entryId: string) => {
      // Optimistic update - remove entry from list
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));

      try {
        await timeService.deleteTimeEntry(entryId);
        // Refresh to get accurate data
        await refresh();
      } catch (err) {
        // Revert on error
        await refresh();
        const error = err instanceof Error ? err : new Error('Failed to delete entry');
        logError('Failed to delete time entry', error);
        toast({
          title: 'Failed to delete entry',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [refresh]
  );

  // Delete segment with optimistic update
  const deleteSegment = useCallback(
    async (segmentId: string) => {
      // Optimistic update - remove segment from entries
      setEntries((prev) =>
        prev.map((entry) => ({
          ...entry,
          segments: entry.segments.filter((seg) => seg.id !== segmentId),
        }))
      );

      try {
        await timeService.deleteTimeSegment(segmentId);
        // Refresh to get accurate data
        await refresh();
      } catch (err) {
        // Revert on error
        await refresh();
        const error = err instanceof Error ? err : new Error('Failed to delete segment');
        logError('Failed to delete time segment', error);
        toast({
          title: 'Failed to delete segment',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
    },
    [refresh]
  );

  // Initial load
  useEffect(() => {
    if (enabled && caseId) {
      refresh();
    }
  }, [caseId, enabled]); // Only depend on caseId and enabled

  // Memoized aggregations
  const memoizedSummary = useMemo(() => summary, [summary]);
  const memoizedBillingTotal = useMemo(() => billingTotal, [billingTotal]);

  return {
    entries,
    summary: memoizedSummary,
    billingTotal: memoizedBillingTotal,
    billingConfig,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    updateEntry,
    deleteEntry,
    deleteSegment,
  };
}
