import { useEffect, useCallback, useMemo, memo } from "react"
import { ArrowUp, ArrowDown, CornerDownLeft, X } from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
} from "../ui/command"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import type { SearchResult } from "@/services/searchService"
import type { InventoryItem } from "@/types/inventory"
import { useSearch } from "@/hooks/useSearch"
import { htmlToText } from "@/lib/html-to-text"
import { MATCH_TYPES, SEARCH_CONFIG } from "./searchConstants"
import { ResultGroup } from "./ResultGroup"
import { SearchEmptyState } from "./SearchEmptyState"
import { SearchLoadingState } from "./SearchLoadingState"
import { SearchErrorState } from "./SearchErrorState"
import { SearchEmptyResults } from "./SearchEmptyResults"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseId?: string
  items: InventoryItem[]
  onFileSelect?: (filePath: string) => void
  onNoteSelect?: (noteId: string) => void
  onSearchChange?: (query: string) => void
  onFindingSelect?: (filePath?: string, findingId?: string) => void
  onTimelineSelect?: (filePath?: string, timelineEventId?: string) => void
}


/**
 * Full-screen search dialog using CommandDialog
 * Opens with Cmd/Ctrl+F or clicking search icon
 */
export const SearchDialog = memo(
  function SearchDialog({
    open,
    onOpenChange,
    caseId,
    items,
    onFileSelect,
    onNoteSelect,
    onSearchChange,
    onFindingSelect,
    onTimelineSelect,
  }: SearchDialogProps) {
    // Use optimized search hook
    const searchOptions = useMemo(
      () => ({
        ...(caseId && { caseId }),
        items,
        debounceMs: SEARCH_CONFIG.DEBOUNCE_MS,
        maxResults: SEARCH_CONFIG.MAX_RESULTS,
        maxProcessed: SEARCH_CONFIG.MAX_PROCESSED,
      }),
      [caseId, items]
    )
    const { query, setQuery, results, loading, error } = useSearch(searchOptions)

    // Handle query changes
    useEffect(() => {
      onSearchChange?.(query)
    }, [query, onSearchChange])

    // Focus input when dialog opens
    useEffect(() => {
      if (open) {
        // Small delay to ensure dialog is fully rendered
        const timer = setTimeout(() => {
          const input = document.querySelector('[cmdk-input]') as HTMLInputElement
          input?.focus()
        }, 100)
        return () => clearTimeout(timer)
      }
    }, [open])

    // Optimized result click handler
    const handleResultSelect = useCallback(
      (result: SearchResult) => {
        // Close dialog on selection
        onOpenChange(false)
        // Don't clear query - preserve it for next open

        // Execute the appropriate handler
        switch (result.match_type) {
          case MATCH_TYPES.FILE:
            if (result.absolute_path && onFileSelect) {
              onFileSelect(result.absolute_path)
            }
            break
          case MATCH_TYPES.NOTE:
            if (result.note_id && onNoteSelect) {
              onNoteSelect(result.note_id)
            }
            break
          case MATCH_TYPES.FINDING:
            if (onFindingSelect) {
              onFindingSelect(result.absolute_path, result.note_id) // note_id contains finding_id
            }
            break
          case MATCH_TYPES.TIMELINE:
            if (onTimelineSelect) {
              onTimelineSelect(result.absolute_path, result.note_id) // note_id contains timeline_event_id
            }
            break
        }
      },
      [onFileSelect, onNoteSelect, onFindingSelect, onTimelineSelect, onOpenChange]
    )

    // Optimized result grouping and sorting
    const groupedResults = useMemo(() => {
      if (!query || results.length === 0) return null

      const lowerQuery = query.toLowerCase()

      // Sort results: exact matches first, then by rank
      const sorted = [...results].sort((a, b) => {
        // Exact match in filename gets highest priority
        const aExact = a.file_name?.toLowerCase() === lowerQuery
        const bExact = b.file_name?.toLowerCase() === lowerQuery
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        // Starts with query gets next priority
        const aStarts = a.file_name?.toLowerCase().startsWith(lowerQuery)
        const bStarts = b.file_name?.toLowerCase().startsWith(lowerQuery)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1

        // Then by rank
        return b.rank - a.rank
      })

      // Group by type using constants
      const groups: Record<string, SearchResult[]> = {
        [MATCH_TYPES.FILE]: [],
        [MATCH_TYPES.NOTE]: [],
        [MATCH_TYPES.FINDING]: [],
        [MATCH_TYPES.TIMELINE]: [],
      }

      sorted.forEach((result) => {
        const matchType = result.match_type as keyof typeof groups
        const group = groups[matchType]
        if (group) {
          group.push(result)
        }
      })

      return groups
    }, [results, query])


    // Get search value for CommandItem filtering
    // ELITE: Optimized - uses fast regex-based HTML to text conversion
    const getSearchValue = useCallback((result: SearchResult): string => {
      const parts: string[] = []
      if (result.file_name) parts.push(result.file_name)
      if (result.folder_path) parts.push(result.folder_path)
      if (result.note_content) {
        // Fast HTML to text extraction (cached, regex-based)
        parts.push(htmlToText(result.note_content))
      }
      return parts.join(" ")
    }, [])

    // Calculate result counts using constants
    const resultCounts = useMemo(() => {
      if (!groupedResults) return null
      return {
        files: groupedResults[MATCH_TYPES.FILE]?.length ?? 0,
        notes: groupedResults[MATCH_TYPES.NOTE]?.length ?? 0,
        findings: groupedResults[MATCH_TYPES.FINDING]?.length ?? 0,
        timeline: groupedResults[MATCH_TYPES.TIMELINE]?.length ?? 0,
        total: results.length,
      }
    }, [groupedResults, results.length])


    return (
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <div className="relative [&_[cmdk-input-wrapper]]:pr-10">
          <CommandInput
            placeholder="Search files, notes, findings, timeline..."
            value={query}
            onValueChange={setQuery}
          />
          {query && (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                setQuery("")
              }}
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {query && resultCounts && resultCounts.total > 0 && (
          <div className="px-4 py-2.5 border-b border-border/40 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span className="font-medium">
              {resultCounts.total} result{resultCounts.total !== 1 ? "s" : ""} found
            </span>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/50 text-[10px] font-mono">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/50 text-[10px] font-mono">
                  ↵
                </kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/50 text-[10px] font-mono">
                  Esc
                </kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        )}
        <CommandList>
          <ScrollArea className="min-h-[300px] max-h-[600px]">
            <div className="p-3">
              {!query && <SearchEmptyState />}
              {loading && query && <SearchLoadingState />}
              {error && <SearchErrorState error={error} />}
              {!loading && results.length === 0 && query && (
                <CommandEmpty>
                  <SearchEmptyResults />
                </CommandEmpty>
              )}
              {!loading && groupedResults && (
                <>
                  <ResultGroup
                    type={MATCH_TYPES.FILE}
                    results={groupedResults[MATCH_TYPES.FILE] || []}
                    query={query}
                    count={resultCounts?.files}
                    onResultSelect={handleResultSelect}
                    getSearchValue={getSearchValue}
                    showSeparator={
                      (groupedResults[MATCH_TYPES.FILE]?.length ?? 0) > 0 &&
                      ((groupedResults[MATCH_TYPES.NOTE]?.length ?? 0) > 0 ||
                        (groupedResults[MATCH_TYPES.FINDING]?.length ?? 0) > 0 ||
                        (groupedResults[MATCH_TYPES.TIMELINE]?.length ?? 0) > 0)
                    }
                  />
                  <ResultGroup
                    type={MATCH_TYPES.NOTE}
                    results={groupedResults[MATCH_TYPES.NOTE] || []}
                    query={query}
                    count={resultCounts?.notes}
                    onResultSelect={handleResultSelect}
                    getSearchValue={getSearchValue}
                    showSeparator={
                      (groupedResults[MATCH_TYPES.NOTE]?.length ?? 0) > 0 &&
                      ((groupedResults[MATCH_TYPES.FINDING]?.length ?? 0) > 0 ||
                        (groupedResults[MATCH_TYPES.TIMELINE]?.length ?? 0) > 0)
                    }
                  />
                  <ResultGroup
                    type={MATCH_TYPES.FINDING}
                    results={groupedResults[MATCH_TYPES.FINDING] || []}
                    query={query}
                    count={resultCounts?.findings}
                    onResultSelect={handleResultSelect}
                    getSearchValue={getSearchValue}
                    showSeparator={
                      (groupedResults[MATCH_TYPES.FINDING]?.length ?? 0) > 0 &&
                      (groupedResults[MATCH_TYPES.TIMELINE]?.length ?? 0) > 0
                    }
                  />
                  <ResultGroup
                    type={MATCH_TYPES.TIMELINE}
                    results={groupedResults[MATCH_TYPES.TIMELINE] || []}
                    query={query}
                    count={resultCounts?.timeline}
                    onResultSelect={handleResultSelect}
                    getSearchValue={getSearchValue}
                    showSeparator={false}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </CommandList>
      </CommandDialog>
    )
  },
  (prevProps, nextProps) => {
    // Custom memoization comparison
    return (
      prevProps.open === nextProps.open &&
      prevProps.caseId === nextProps.caseId &&
      prevProps.items === nextProps.items &&
      prevProps.onFileSelect === nextProps.onFileSelect &&
      prevProps.onNoteSelect === nextProps.onNoteSelect &&
      prevProps.onSearchChange === nextProps.onSearchChange &&
      prevProps.onFindingSelect === nextProps.onFindingSelect &&
      prevProps.onTimelineSelect === nextProps.onTimelineSelect
    )
  }
)

