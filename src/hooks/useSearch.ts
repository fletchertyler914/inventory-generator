import { useState, useEffect, useCallback, useMemo } from 'react';
import { searchService, type SearchResult } from '@/services/searchService';
import { useDebounce } from './useDebounce';
import { getStoreValue, setStoreValue } from '@/lib/store-utils';
import type { InventoryItem } from '@/types/inventory';

interface UseSearchOptions {
  caseId?: string;
  items: InventoryItem[];
  debounceMs?: number;
  maxResults?: number;
  maxProcessed?: number;
}

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
}

/**
 * ELITE: Optimized search hook with performance optimizations
 * 
 * Features:
 * - Debounced search queries
 * - Local search fallback with early termination
 * - Result limiting for scalability
 * - Error handling and recovery
 * - Memoized computations
 */
export function useSearch({
  caseId,
  items,
  debounceMs = 300,
  maxResults = 50,
  maxProcessed = 5000,
}: UseSearchOptions): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [queryLoaded, setQueryLoaded] = useState(false);
  const debouncedQuery = useDebounce(query, debounceMs);

  // Load saved search query from store on mount
  useEffect(() => {
    if (!caseId) {
      setQueryLoaded(true);
      return;
    }

    let mounted = true;

    const loadSavedQuery = async () => {
      try {
        const savedQuery = await getStoreValue<string>(
          `casespace-search-query-${caseId}`,
          '',
          'settings'
        );
        if (mounted) {
          setQuery(savedQuery);
          setQueryLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load saved search query:', error);
        if (mounted) {
          setQueryLoaded(true);
        }
      }
    };

    loadSavedQuery();

    return () => {
      mounted = false;
    };
  }, [caseId]);

  // Save search query to store (debounced)
  useEffect(() => {
    if (!caseId || !queryLoaded) return; // Don't save during initial load

    const saveQuery = async () => {
      try {
        await setStoreValue(
          `casespace-search-query-${caseId}`,
          query,
          'settings'
        );
      } catch (error) {
        console.error('Failed to save search query:', error);
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveQuery, 500);
    return () => clearTimeout(timeoutId);
  }, [query, caseId, queryLoaded]);

  // Clear query when case changes
  useEffect(() => {
    if (queryLoaded) {
      setQuery('');
    }
  }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize inventory field parser to avoid repeated JSON parsing
  const parseInventoryData = useCallback((inventoryData: string | null | undefined): Record<string, unknown> | null => {
    if (!inventoryData) return null;
    try {
      return JSON.parse(inventoryData) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, []);

  // Optimized local search with early termination
  const searchLocal = useCallback(
    (searchQuery: string): SearchResult[] => {
      if (!searchQuery.trim()) return [];

      const lowerQuery = searchQuery.toLowerCase();
      const matches: SearchResult[] = [];
      const processedLimit = Math.min(items.length, maxProcessed);
      const resultLimit = maxResults * 2; // Collect more than needed for better sorting

      // Early termination: stop once we have enough high-scoring results
      for (let i = 0; i < processedLimit && matches.length < resultLimit; i++) {
        const item = items[i];
        if (!item) continue;

        let score = 0;
        const fileNameLower = item.file_name.toLowerCase();

        // Fast path: check file_name first (most common search target)
        if (fileNameLower.includes(lowerQuery)) {
          score += 10;
        } else {
          // Parse inventory data once per item
          const inventoryData = parseInventoryData(item.inventory_data);
          
          if (inventoryData) {
            // Check standard fields
            const docDesc = String(inventoryData.document_description || '').toLowerCase();
            const docType = String(inventoryData.document_type || '').toLowerCase();
            const notes = String(inventoryData.notes || '').toLowerCase();
            
            if (docDesc.includes(lowerQuery)) score += 5;
            if (docType.includes(lowerQuery)) score += 3;
            if (notes.includes(lowerQuery)) score += 2;

            // Check custom fields (only if standard fields didn't match)
            if (score === 0) {
              for (const [key, value] of Object.entries(inventoryData)) {
                // Skip standard fields we already checked
                if (['document_description', 'document_type', 'notes'].includes(key)) continue;
                if (String(value).toLowerCase().includes(lowerQuery)) {
                  score += 2;
                  break; // Only count once per item
                }
              }
            }
          }
        }

        if (score > 0) {
          matches.push({
            file_name: item.file_name,
            folder_path: item.folder_path,
            absolute_path: item.absolute_path,
            match_type: 'file',
            rank: score,
          });
        }
      }

      // Sort by rank and limit results
      return matches.sort((a, b) => b.rank - a.rank).slice(0, maxResults);
    },
    [items, maxResults, maxProcessed, parseInventoryData]
  );

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        let searchResults: SearchResult[];

        if (caseId) {
          // Use database FTS5 search (preferred)
          searchResults = await searchService.searchAll(caseId, debouncedQuery);
        } else {
          // Fallback to local search
          searchResults = searchLocal(debouncedQuery);
        }

        if (!cancelled) {
          setResults(searchResults);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('Search failed');
          setError(error);
          console.error('Search error:', error);
          
          // Fallback to local search on error
          try {
            const localResults = searchLocal(debouncedQuery);
            if (!cancelled) {
              setResults(localResults);
            }
          } catch (localError) {
            if (!cancelled) {
              console.error('Local search fallback failed:', localError);
              setResults([]);
            }
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    performSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, caseId, searchLocal]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
  };
}

