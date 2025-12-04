import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import type { SearchResult } from '@/services/searchService';
import type { InventoryItem } from '@/types/inventory';
import { useSearch } from '@/hooks/useSearch';
import { SearchResultsGroup } from './SearchResultsGroup';

interface SearchBarProps {
  caseId?: string;
  items: InventoryItem[];
  onFileSelect?: (filePath: string) => void;
  onNoteSelect?: (noteId: string) => void;
  onSearchChange?: (query: string) => void;
  onFindingSelect?: () => void;
  onTimelineSelect?: () => void;
}

// Constants
const MODIFIER_KEY_MAC = '⌘';
const MODIFIER_KEY_OTHER = '⌃';
const MAX_RESULTS = 50;
const MAX_PROCESSED = 5000;
const DEBOUNCE_MS = 300;

/**
 * Detect if running on macOS
 * Memoized to avoid repeated checks
 */
const isMacOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as Navigator & { userAgentData?: { platform: string } };
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === 'macos';
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac os x') || userAgent.includes('macintosh')) {
    return true;
  }

  const platform = navigator.platform?.toUpperCase() || '';
  return platform.indexOf('MAC') >= 0;
};

/**
 * ELITE: Optimized SearchBar Component
 * 
 * Performance optimizations:
 * - Custom useSearch hook with debouncing and result limiting
 * - Memoized sub-components to prevent unnecessary re-renders
 * - Optimized event handlers with useCallback
 * - Efficient result grouping and sorting
 * 
 * Scalability:
 * - Result limiting (50 max)
 * - Local search processing limit (5000 items)
 * - Early termination in search algorithms
 * 
 * Modularity:
 * - Separated search logic into useSearch hook
 * - Extracted result rendering into SearchResultItem and SearchResultsGroup
 * - Clear separation of concerns
 * 
 * Maintainability:
 * - Type-safe interfaces
 * - Clear function names and documentation
 * - Consistent code patterns
 * - Error handling
 */
export const SearchBar = memo(function SearchBar({
  caseId,
  items,
  onFileSelect,
  onNoteSelect,
  onSearchChange,
  onFindingSelect,
  onTimelineSelect,
}: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use optimized search hook
  const { query, setQuery, results, loading, error } = useSearch({
    caseId,
    items,
    debounceMs: DEBOUNCE_MS,
    maxResults: MAX_RESULTS,
    maxProcessed: MAX_PROCESSED,
  });

  // Memoize platform detection
  const modifierKey = useMemo(() => (isMacOS() ? MODIFIER_KEY_MAC : MODIFIER_KEY_OTHER), []);
  const placeholder = useMemo(
    () => `Search files, notes, findings, timeline... (${modifierKey}K)`,
    [modifierKey]
  );

  // Centralized logic: popover visibility driven by query state
  useEffect(() => {
    if (query.trim().length > 0 && !open) {
      setOpen(true);
    }
  }, [query, open]);

  // Cmd/Ctrl + K: Only focus the input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isInput && target !== inputRef.current) return;

      const modifier = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Optimized result click handler
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      switch (result.match_type) {
        case 'file':
          if (result.absolute_path && onFileSelect) {
            onFileSelect(result.absolute_path);
            setOpen(false);
            setQuery('');
          }
          break;
        case 'note':
          if (result.note_id && onNoteSelect) {
            onNoteSelect(result.note_id);
            setOpen(false);
            setQuery('');
          }
          break;
        case 'finding':
          if (onFindingSelect) {
            onFindingSelect();
            setOpen(false);
            setQuery('');
          }
          break;
        case 'timeline':
          if (onTimelineSelect) {
            onTimelineSelect();
            setOpen(false);
            setQuery('');
          }
          break;
      }
    },
    [onFileSelect, onNoteSelect, onFindingSelect, onTimelineSelect]
  );

  // Optimized result grouping and sorting
  const groupedResults = useMemo(() => {
    if (!query || results.length === 0) return null;

    const lowerQuery = query.toLowerCase();

    // Sort results: exact matches first, then by rank
    const sorted = [...results].sort((a, b) => {
      // Exact match in filename gets highest priority
      const aExact = a.file_name?.toLowerCase() === lowerQuery;
      const bExact = b.file_name?.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Starts with query gets next priority
      const aStarts = a.file_name?.toLowerCase().startsWith(lowerQuery);
      const bStarts = b.file_name?.toLowerCase().startsWith(lowerQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Then by rank
      return b.rank - a.rank;
    });

    // Group by type
    const groups: Record<string, SearchResult[]> = {
      file: [],
      note: [],
      finding: [],
      timeline: [],
    };

    sorted.forEach((result) => {
      const matchType = result.match_type as keyof typeof groups;
      const group = groups[matchType];
      if (group) {
        group.push(result);
      }
    });

    return groups;
  }, [results, query]);

  // Memoized highlight function
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!text || !query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary font-medium px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  // Memoized file extension getter
  const getFileExtension = useCallback((fileName?: string): string => {
    if (!fileName) return '';
    const parts = fileName.split('.');
    return parts.length > 1 ? (parts[parts.length - 1] || '').toUpperCase() : '';
  }, []);

  // Check if result is clickable
  const isResultClickable = useCallback(
    (result: SearchResult): boolean => {
      switch (result.match_type) {
        case 'file':
          return !!(result.absolute_path && onFileSelect);
        case 'note':
          return !!(result.note_id && onNoteSelect);
        case 'finding':
          return !!onFindingSelect;
        case 'timeline':
          return !!onTimelineSelect;
        default:
          return false;
      }
    },
    [onFileSelect, onNoteSelect, onFindingSelect, onTimelineSelect]
  );

  // Input handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onSearchChange?.('');
  }, [onSearchChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      const firstResult = document.querySelector('[data-search-result]') as HTMLElement;
      firstResult?.focus();
    }
  }, [results.length]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-slot="popover-content"]')) {
      return;
    }
    if (target.tagName === 'INPUT' || target.closest('input') || target === inputRef.current) {
      e.stopPropagation();
      if (query.trim().length > 0) {
        setOpen(true);
      }
    }
  }, [query]);

  const handlePopoverOutside = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    if (target === inputRef.current || target.closest('[data-slot="popover-trigger"]')) {
      e.preventDefault();
    }
  }, []);

  return (
    <Popover open={open} modal={false} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="relative w-[600px] border rounded-md bg-background shadow-sm border-border/50 dark:border-border/60"
          onPointerDown={handlePointerDown}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            placeholder={placeholder}
            className="pl-10 pr-10 h-11 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="!w-[700px] min-w-[700px] max-w-[700px] p-0 bg-popover text-popover-foreground dark:bg-popover dark:text-popover-foreground border-border/50 dark:border-border/60 shadow-lg"
        align="center"
        sideOffset={8}
        onPointerDownOutside={handlePopoverOutside}
        onInteractOutside={handlePopoverOutside}
        style={{
          width: '700px',
          minWidth: '700px',
          maxWidth: '700px',
        }}
      >
        <div className="flex flex-col bg-popover">
          {query && (
            <div className="px-4 py-2.5 border-b border-border/40 dark:border-border/50 bg-popover">
              <div className="text-xs font-medium text-muted-foreground">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Searching...
                  </span>
                ) : error ? (
                  <span className="text-destructive">Search error occurred</span>
                ) : results.length > 0 ? (
                  `${results.length} result${results.length !== 1 ? 's' : ''}`
                ) : (
                  'No results found'
                )}
              </div>
            </div>
          )}
          {!query && (
            <div className="px-4 py-3 border-b border-border/40 dark:border-border/50 bg-popover">
              <div className="text-sm text-muted-foreground">
                Start typing to search files and notes...
              </div>
            </div>
          )}
          <ScrollArea className="max-h-[500px] bg-popover">
            <div className="p-2 bg-popover">
              {loading ? (
                <div className="flex items-center justify-center py-16 bg-popover">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center py-16 bg-popover">
                  <div className="text-sm text-destructive mb-1">Search error</div>
                  <div className="text-xs text-muted-foreground/70">
                    Please try again or use local search
                  </div>
                </div>
              ) : results.length === 0 && query ? (
                <div className="text-center py-16 bg-popover">
                  <div className="text-sm text-muted-foreground mb-1">No results found</div>
                  <div className="text-xs text-muted-foreground/70">Try a different search term</div>
                </div>
              ) : groupedResults ? (
                <div className="space-y-4 bg-popover">
                  <SearchResultsGroup
                    title="Files"
                    results={groupedResults.file}
                    query={query}
                    onSelect={handleResultClick}
                    isClickable={isResultClickable}
                    highlightMatch={highlightMatch}
                    getFileExtension={getFileExtension}
                  />
                  <SearchResultsGroup
                    title="Notes"
                    results={groupedResults.note}
                    query={query}
                    onSelect={handleResultClick}
                    isClickable={isResultClickable}
                    highlightMatch={highlightMatch}
                    getFileExtension={getFileExtension}
                  />
                  <SearchResultsGroup
                    title="Findings"
                    results={groupedResults.finding}
                    query={query}
                    onSelect={handleResultClick}
                    isClickable={isResultClickable}
                    highlightMatch={highlightMatch}
                    getFileExtension={getFileExtension}
                  />
                  <SearchResultsGroup
                    title="Timeline"
                    results={groupedResults.timeline}
                    query={query}
                    onSelect={handleResultClick}
                    isClickable={isResultClickable}
                    highlightMatch={highlightMatch}
                    getFileExtension={getFileExtension}
                  />
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}, (prevProps, nextProps) => {
  // Custom memoization comparison
  return (
    prevProps.caseId === nextProps.caseId &&
    prevProps.items === nextProps.items &&
    prevProps.onFileSelect === nextProps.onFileSelect &&
    prevProps.onNoteSelect === nextProps.onNoteSelect &&
    prevProps.onSearchChange === nextProps.onSearchChange &&
    prevProps.onFindingSelect === nextProps.onFindingSelect &&
    prevProps.onTimelineSelect === nextProps.onTimelineSelect
  );
});
