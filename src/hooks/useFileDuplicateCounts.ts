import { useState, useEffect, useMemo, useCallback } from 'react';
import { duplicateService } from '@/services/duplicateService';

/**
 * ELITE: Optimized hook for fetching and caching file duplicate counts
 * 
 * ARCHITECTURE:
 * - Cache is source of truth - hook reads from cache, never forces refresh
 * - App.tsx pre-warms cache before UI shows (optional optimization)
 * - Cache deduplication ensures only one request if multiple components fetch
 * - Memoized Map lookups for O(1) access in components
 * 
 * PERFORMANCE:
 * - Single query for entire case (scalable to thousands of files)
 * - Automatic request deduplication via cachedInvoke
 * - Memoized results prevent unnecessary re-renders
 * - Cancellation support prevents memory leaks
 * 
 * MODULARITY:
 * - Self-contained: hook manages its own data fetching
 * - No external dependencies on App.tsx or other components
 * - Cache layer handles all optimization transparently
 * 
 * MAINTAINABILITY:
 * - Clear separation of concerns: hook owns duplicate data
 * - Error handling doesn't break UI (graceful degradation)
 * - Type-safe with proper TypeScript types
 */
export function useFileDuplicateCounts(caseId: string | undefined) {
  const [duplicateCounts, setDuplicateCounts] = useState<Record<string, number>>({});
  const [duplicateGroupIds, setDuplicateGroupIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize Map for O(1) lookups
  const duplicateCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [fileId, count] of Object.entries(duplicateCounts)) {
      map.set(fileId, count);
    }
    return map;
  }, [duplicateCounts]);

  // Memoize group ID map for O(1) lookups
  const duplicateGroupIdsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [fileId, groupId] of Object.entries(duplicateGroupIds)) {
      map.set(fileId, groupId);
    }
    return map;
  }, [duplicateGroupIds]);

  // Fetch duplicate counts
  useEffect(() => {
    if (!caseId) {
      setDuplicateCounts({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // Cache is source of truth - read from cache (never force refresh)
        // App.tsx may pre-warm cache, but hook is self-sufficient
        // Cache deduplication ensures only one request if multiple components fetch
        // If cache is empty/stale, cachedInvoke will fetch and cache automatically
        const groups = await duplicateService.findAllDuplicateGroups(caseId, false);
        
        // Build count map: fileId -> duplicate count (excluding itself)
        // Build group ID map: fileId -> group_id
        const counts: Record<string, number> = {};
        const groupIds: Record<string, string> = {};
        for (const group of groups) {
          for (const file of group.files) {
            // Count is number of other files in the group
            counts[file.file_id] = group.count - 1;
            // Store group_id for color consistency
            groupIds[file.file_id] = group.group_id;
          }
        }
        
        if (!cancelled) {
          setDuplicateCounts(counts);
          setDuplicateGroupIds(groupIds);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Failed to fetch duplicate counts');
          setError(error);
          const { logError } = require('@/lib/logger');
          logError('[useFileDuplicateCounts] Error fetching duplicate counts', error);
          // Return empty counts on error (files show no indicator)
          setDuplicateCounts({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  // Expose refetch function for manual refresh
  const refetch = useCallback(() => {
    if (caseId) {
      duplicateService.findAllDuplicateGroups(caseId, true)
        .then((groups) => {
        const counts: Record<string, number> = {};
        const groupIds: Record<string, string> = {};
        for (const group of groups) {
          for (const file of group.files) {
            counts[file.file_id] = group.count - 1;
            groupIds[file.file_id] = group.group_id;
          }
        }
        setDuplicateCounts(counts);
        setDuplicateGroupIds(groupIds);
        })
        .catch((err) => {
          const { logError } = require('@/lib/logger');
          logError('[useFileDuplicateCounts] Error refetching', err);
        });
    }
  }, [caseId]);

  return {
    duplicateCounts: duplicateCountsMap,
    duplicateGroupIds: duplicateGroupIdsMap,
    duplicateCountsRecord: duplicateCounts,
    loading,
    error,
    refetch,
  };
}

