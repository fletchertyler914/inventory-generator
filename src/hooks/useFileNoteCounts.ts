import { useState, useEffect, useMemo, useCallback } from 'react';
import { noteService } from '@/services/noteService';

/**
 * ELITE: Optimized hook for fetching and caching file note counts
 * 
 * Features:
 * - Fetches note counts for entire case (single query, scalable)
 * - Automatic caching via cachedInvoke in service layer
 * - Memoized results for O(1) lookups
 * - Cancellation support for cleanup
 * - Error handling that doesn't break UI
 * - Only fetches when caseId is defined
 */
export function useFileNoteCounts(caseId: string | undefined) {
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize Map for O(1) lookups
  const noteCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [fileId, count] of Object.entries(noteCounts)) {
      map.set(fileId, count);
    }
    return map;
  }, [noteCounts]);

  // Fetch note counts
  useEffect(() => {
    if (!caseId) {
      setNoteCounts({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const counts = await noteService.getFileNoteCounts(caseId);
        if (!cancelled) {
          setNoteCounts(counts);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Failed to fetch note counts');
          setError(error);
          console.error('[useFileNoteCounts] Error fetching note counts:', error);
          // Return empty counts on error (files show no indicator)
          setNoteCounts({});
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
    return noteService.getFileNoteCounts(caseId || '', true).then((counts) => {
      setNoteCounts(counts);
      setError(null);
    }).catch((err) => {
      const error = err instanceof Error ? err : new Error('Failed to refetch note counts');
      setError(error);
      console.error('[useFileNoteCounts] Error refetching note counts:', error);
      setNoteCounts({});
    });
  }, [caseId]);

  return {
    noteCounts: noteCountsMap,
    loading,
    error,
    refetch,
  };
}

