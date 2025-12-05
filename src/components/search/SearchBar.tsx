import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, Search, StickyNote, AlertTriangle, Calendar, Folder } from "lucide-react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "../ui/command"
import { ScrollArea } from "../ui/scroll-area"
import type { SearchResult } from "@/services/searchService"
import type { InventoryItem } from "@/types/inventory"
import { useSearch } from "@/hooks/useSearch"
import { getFileIcon } from "@/lib/file-icon-utils"
import { TiptapEditor } from "../notes/TiptapEditor"
import { MATCH_TYPES } from "./searchConstants"

interface SearchBarProps {
  caseId?: string
  items: InventoryItem[]
  onFileSelect?: (filePath: string) => void
  onNoteSelect?: (noteId: string) => void
  onSearchChange?: (query: string) => void
  onFindingSelect?: (filePath?: string, findingId?: string) => void
  onTimelineSelect?: (filePath?: string, timelineEventId?: string) => void
}

// Constants
const MODIFIER_KEY_MAC = "⌘"
const MODIFIER_KEY_OTHER = "⌃"
const MAX_RESULTS = 50
const MAX_PROCESSED = 5000
const DEBOUNCE_MS = 300

/**
 * Detect if running on macOS
 * Memoized to avoid repeated checks
 */
const isMacOS = (): boolean => {
  if (typeof navigator === "undefined") return false

  const nav = navigator as Navigator & { userAgentData?: { platform: string } }
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "macos"
  }

  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("mac os x") || userAgent.includes("macintosh")) {
    return true
  }

  const platform = navigator.platform?.toUpperCase() || ""
  return platform.indexOf("MAC") >= 0
}

/**
 * ELITE: Optimized SearchBar Component using shadcn Command
 *
 * Features:
 * - Uses Command component directly in header (not in dialog)
 * - CommandList only shows when CommandInput is focused
 * - Cmd/Ctrl+F to focus input (like a finder)
 * - Search across files, notes, findings, timeline
 * - Result grouping with CommandGroup
 * - Individual results with CommandItem
 * - Proper scrolling with ScrollArea
 */
export const SearchBar = memo(
  function SearchBar({
    caseId,
    items,
    onFileSelect,
    onNoteSelect,
    onSearchChange,
    onFindingSelect,
    onTimelineSelect,
  }: SearchBarProps) {
    const [isFocused, setIsFocused] = useState(false)
    const [resultsPosition, setResultsPosition] = useState<{ top: number; left: number } | null>(
      null
    )
    const inputRef = useRef<HTMLInputElement>(null)
    const commandRef = useRef<HTMLDivElement>(null)

    // Use optimized search hook
    const searchOptions = useMemo(
      () => ({
        ...(caseId && { caseId }),
        items,
        debounceMs: DEBOUNCE_MS,
        maxResults: MAX_RESULTS,
        maxProcessed: MAX_PROCESSED,
      }),
      [caseId, items]
    )
    const { query, setQuery, results, loading, error } = useSearch(searchOptions)

    // Memoize platform detection
    const modifierKey = useMemo(() => (isMacOS() ? MODIFIER_KEY_MAC : MODIFIER_KEY_OTHER), [])

    // Cmd/Ctrl + F: Focus the search input
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        const isInput =
          target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

        // Don't intercept if user is typing in an input (unless it's our search input)
        if (isInput && target !== inputRef.current) return

        const modifier =
          navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? e.metaKey : e.ctrlKey

        if (modifier && e.key.toLowerCase() === "f") {
          e.preventDefault()
          inputRef.current?.focus()
          inputRef.current?.select()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Handle query changes
    useEffect(() => {
      onSearchChange?.(query)
    }, [query, onSearchChange])

    // Optimized result click handler
    const handleResultSelect = useCallback(
      (result: SearchResult) => {
        // Blur input and close results on selection
        setIsFocused(false)
        inputRef.current?.blur()

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
      [onFileSelect, onNoteSelect, onFindingSelect, onTimelineSelect]
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

      // Group by type
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

    // Memoized highlight function
    const highlightMatch = useCallback((text: string, query: string) => {
      if (!text || !query) return text
      const parts = text.split(new RegExp(`(${query})`, "gi"))
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
      )
    }, [])

    // Memoized file extension getter
    const getFileExtension = useCallback((fileName?: string): string => {
      if (!fileName) return ""
      const parts = fileName.split(".")
      return parts.length > 1 ? (parts[parts.length - 1] || "").toUpperCase() : ""
    }, [])

    // Render result content based on type
    const renderResultContent = useCallback(
      (result: SearchResult) => {
        switch (result.match_type) {
          case MATCH_TYPES.FILE: {
            const ext = getFileExtension(result.file_name)
            return (
              <>
                {getFileIcon(
                  result.file_name || "",
                  "h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5"
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <div className="text-sm font-medium text-foreground truncate leading-tight">
                      {result.file_name ? highlightMatch(result.file_name, query) : "Untitled"}
                    </div>
                    {ext && (
                      <span className="text-[10px] text-muted-foreground/70 font-mono px-1.5 py-0.5 bg-muted/30 rounded flex-shrink-0">
                        {ext}
                      </span>
                    )}
                  </div>
                  {result.folder_path && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                      <Folder className="h-3 w-3 opacity-60 flex-shrink-0" />
                      <span className="truncate">{result.folder_path}</span>
                    </div>
                  )}
                </div>
              </>
            )
          }

          case MATCH_TYPES.NOTE: {
            return (
              <>
                <StickyNote className="h-4 w-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Note
                  </div>
                  {result.note_content && (
                    <div className="text-sm text-foreground line-clamp-2 leading-relaxed overflow-hidden max-h-[3rem]">
                      <TiptapEditor
                        content={result.note_content}
                        onChange={() => {}}
                        editable={false}
                        className="pointer-events-none h-auto [&_.ProseMirror]:line-clamp-2 [&_.ProseMirror]:text-sm [&_.ProseMirror]:p-0 [&_.ProseMirror]:prose-sm [&_.ProseMirror]:overflow-hidden [&_.ProseMirror]:text-foreground"
                      />
                    </div>
                  )}
                </div>
              </>
            )
          }

          case MATCH_TYPES.FINDING: {
            return (
              <>
                <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-sm font-medium text-foreground leading-tight">
                    {result.file_name ? highlightMatch(result.file_name, query) : "Finding"}
                  </div>
                  {result.note_content && (
                    <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {highlightMatch(result.note_content, query)}
                    </div>
                  )}
                </div>
              </>
            )
          }

          case MATCH_TYPES.TIMELINE: {
            return (
              <>
                <Calendar className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Timeline Event
                  </div>
                  {result.note_content && (
                    <div className="text-sm text-foreground line-clamp-2 leading-relaxed">
                      {highlightMatch(result.note_content, query)}
                    </div>
                  )}
                </div>
              </>
            )
          }

          default:
            return null
        }
      },
      [query, highlightMatch, getFileExtension]
    )

    // Get search value for CommandItem filtering
    const getSearchValue = useCallback((result: SearchResult): string => {
      const parts: string[] = []
      if (result.file_name) parts.push(result.file_name)
      if (result.folder_path) parts.push(result.folder_path)
      if (result.note_content) {
        // Extract plain text from HTML for search
        const div = document.createElement("div")
        div.innerHTML = result.note_content
        parts.push(div.textContent || div.innerText || "")
      }
      return parts.join(" ")
    }, [])

    // Calculate position for results panel
    const updateResultsPosition = useCallback(() => {
      if (commandRef.current) {
        const rect = commandRef.current.getBoundingClientRect()
        setResultsPosition({
          top: rect.bottom + 8, // 8px offset (mt-2)
          left: rect.left + (rect.width - 700) / 2, // Center the 700px panel
        })
      }
    }, [])

    // Track focus state using a wrapper div and direct checks
    const handleInputFocus = useCallback(() => {
      setIsFocused(true)
      updateResultsPosition()
      // Ensure input is focused when clicking back into it
      inputRef.current?.focus()
    }, [updateResultsPosition])

    // Handle click on input wrapper to ensure focus
    const handleInputClick = useCallback(() => {
      inputRef.current?.focus()
      setIsFocused(true)
      updateResultsPosition()
    }, [updateResultsPosition])

    const handleInputBlur = useCallback(() => {
      // Delay to allow click events on results to fire
      setTimeout(() => {
        const activeElement = document.activeElement
        // Keep focused if clicking on results
        if (!activeElement?.closest("[cmdk-list]") && !activeElement?.closest("[cmdk-item]")) {
          setIsFocused(false)
          setResultsPosition(null)
        }
      }, 150)
    }, [])

    // Also check focus state periodically to catch cases where events don't fire
    useEffect(() => {
      const checkFocus = () => {
        const activeElement = document.activeElement
        const inputWrapper = commandRef.current?.querySelector("[cmdk-input-wrapper]")
        const actualInput = inputWrapper?.querySelector("input")

        if (
          actualInput &&
          (activeElement === actualInput ||
            activeElement?.closest("[cmdk-input-wrapper]") === inputWrapper)
        ) {
          setIsFocused(true)
          updateResultsPosition()
        } else if (activeElement?.closest("[cmdk-list]") || activeElement?.closest("[cmdk-item]")) {
          setIsFocused(true)
        } else if (!activeElement?.closest("[cmdk-input-wrapper]")) {
          // Only set to false if we're definitely not in the command component
          setIsFocused(false)
          setResultsPosition(null)
        }
      }

      const interval = setInterval(checkFocus, 200)
      return () => clearInterval(interval)
    }, [updateResultsPosition])

    // Update position on scroll/resize
    useEffect(() => {
      if (isFocused) {
        const handleScroll = () => updateResultsPosition()
        const handleResize = () => updateResultsPosition()
        window.addEventListener("scroll", handleScroll, true)
        window.addEventListener("resize", handleResize)
        return () => {
          window.removeEventListener("scroll", handleScroll, true)
          window.removeEventListener("resize", handleResize)
        }
      }
    }, [isFocused, updateResultsPosition])

    // Show results when input is focused AND has a value
    const shouldShowResults = isFocused && query.trim().length > 0

    return (
      <div className="relative w-[600px]">
        <Command
          ref={commandRef}
          className="rounded-lg border shadow-sm border-border/50 dark:border-border/60 bg-background [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-group]]:py-1 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5"
          shouldFilter={false}
        >
          <div
            className="relative flex items-center [&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:p-0 [&_[cmdk-input-wrapper]]:flex [&_[cmdk-input-wrapper]]:items-center [&_[cmdk-input-wrapper]]:w-full [&_[cmdk-input-wrapper]_svg]:hidden"
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onClick={handleInputClick}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
            <CommandInput
              ref={inputRef}
              placeholder={`Search files, notes, findings, timeline... (${modifierKey}F)`}
              value={query}
              onValueChange={setQuery}
              className="pl-10 pr-10 h-11 text-base border-0 bg-transparent focus-visible:ring-0"
            />
            {query && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setQuery("")
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </Command>
        {shouldShowResults && (
          <SearchResultsPanel
            isVisible={shouldShowResults}
            position={resultsPosition}
            query={query}
            loading={loading}
            error={error}
            results={results}
            groupedResults={groupedResults}
            onResultSelect={handleResultSelect}
            renderResultContent={renderResultContent}
            getSearchValue={getSearchValue}
          />
        )}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom memoization comparison
    return (
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

// Render results panel in portal
function SearchResultsPanel({
  isVisible,
  position,
  query,
  loading,
  error,
  results,
  groupedResults,
  onResultSelect,
  renderResultContent,
  getSearchValue,
}: {
  isVisible: boolean
  position: { top: number; left: number } | null
  query: string
  loading: boolean
  error: Error | null
  results: SearchResult[]
  groupedResults: Record<string, SearchResult[]> | null
  onResultSelect: (result: SearchResult) => void
  renderResultContent: (result: SearchResult) => React.ReactNode
  getSearchValue: (result: SearchResult) => string
}) {
  // Get computed popover background color (matching PopoverContent)
  const popoverBgColor = useMemo(() => {
    if (typeof window === "undefined") return "#1a1a1a"
    try {
      const testEl = document.createElement("div")
      testEl.className = "bg-popover"
      testEl.style.display = "none"
      document.body.appendChild(testEl)
      const computedColor = getComputedStyle(testEl).backgroundColor
      document.body.removeChild(testEl)
      if (
        computedColor &&
        computedColor !== "rgba(0, 0, 0, 0)" &&
        computedColor !== "transparent"
      ) {
        return computedColor
      }
    } catch (e) {
      console.warn("Failed to compute popover color:", e)
    }
    const root = document.documentElement
    const popoverValue = getComputedStyle(root).getPropertyValue("--popover").trim()
    if (popoverValue) {
      return popoverValue
    }
    return "#1a1a1a"
  }, [])

  if (!isVisible || !position) return null

  return createPortal(
    <Command
      className="fixed w-[700px] p-0 bg-popover text-popover-foreground dark:bg-popover dark:text-popover-foreground rounded-md border border-border/50 dark:border-border/60 shadow-md outline-hidden overflow-hidden [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group]]:px-2 [&_[cmdk-group]]:py-1 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5"
      shouldFilter={false}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
        backgroundColor: popoverBgColor,
        opacity: 1,
        backdropFilter: "none",
        pointerEvents: "auto",
      }}
    >
      {query && (
        <div className="px-4 py-2.5 border-b border-border/40 dark:border-border/50">
          <div className="text-xs font-medium text-muted-foreground">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching...
              </span>
            ) : error ? (
              <span className="text-destructive">Search error occurred</span>
            ) : results.length > 0 ? (
              `${results.length} result${results.length !== 1 ? "s" : ""}`
            ) : (
              "No results found"
            )}
          </div>
        </div>
      )}
      <CommandList>
        <ScrollArea className="min-h-[200px] max-h-[500px]">
          <div className="p-2">
            {loading && !query && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="text-center py-16">
                <div className="text-sm text-destructive mb-1">Search error</div>
                <div className="text-xs text-muted-foreground/70">
                  Please try again or use local search
                </div>
              </div>
            )}
            {!loading && results.length === 0 && query && (
              <CommandEmpty>
                <div className="text-center py-16">
                  <div className="text-sm text-muted-foreground mb-1">No results found</div>
                  <div className="text-xs text-muted-foreground/70">
                    Try a different search term
                  </div>
                </div>
              </CommandEmpty>
            )}
            {!loading && groupedResults && (
              <>
                {(groupedResults[MATCH_TYPES.FILE]?.length ?? 0) > 0 &&
                  groupedResults[MATCH_TYPES.FILE] && (
                    <CommandGroup heading="FILES">
                      {(groupedResults[MATCH_TYPES.FILE] ?? []).map((result, index) => (
                        <CommandItem
                          key={`file-${result.file_id || result.absolute_path || index}`}
                          value={getSearchValue(result)}
                          onSelect={() => onResultSelect(result)}
                          className="w-full flex items-start gap-3 rounded-lg cursor-pointer [&_*]:pointer-events-none"
                        >
                          {renderResultContent(result)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                {(groupedResults[MATCH_TYPES.FILE]?.length ?? 0) > 0 &&
                  ((groupedResults[MATCH_TYPES.NOTE]?.length ?? 0) > 0 ||
                    (groupedResults[MATCH_TYPES.FINDING]?.length ?? 0) > 0 ||
                    (groupedResults[MATCH_TYPES.TIMELINE]?.length ?? 0) > 0) && (
                    <CommandSeparator />
                  )}
                {(groupedResults[MATCH_TYPES.NOTE]?.length ?? 0) > 0 &&
                  groupedResults[MATCH_TYPES.NOTE] && (
                    <CommandGroup heading="NOTES">
                      {(groupedResults[MATCH_TYPES.NOTE] ?? []).map((result, index) => (
                        <CommandItem
                          key={`note-${result.note_id || index}`}
                          value={getSearchValue(result)}
                          onSelect={() => onResultSelect(result)}
                          className="w-full flex items-start gap-3 rounded-lg cursor-pointer [&_*]:pointer-events-none"
                        >
                          {renderResultContent(result)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                {(groupedResults[MATCH_TYPES.NOTE]?.length ?? 0) > 0 &&
                  ((groupedResults[MATCH_TYPES.FINDING]?.length ?? 0) > 0 ||
                    (groupedResults[MATCH_TYPES.TIMELINE]?.length ?? 0) > 0) && (
                    <CommandSeparator />
                  )}
                {(groupedResults[MATCH_TYPES.FINDING]?.length ?? 0) > 0 &&
                  groupedResults[MATCH_TYPES.FINDING] && (
                    <CommandGroup heading="FINDINGS">
                      {(groupedResults[MATCH_TYPES.FINDING] ?? []).map((result, index) => (
                        <CommandItem
                          key={`finding-${index}`}
                          value={getSearchValue(result)}
                          onSelect={() => onResultSelect(result)}
                          className="w-full flex items-start gap-3 rounded-lg cursor-pointer [&_*]:pointer-events-none"
                        >
                          {renderResultContent(result)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                {(groupedResults[MATCH_TYPES.FINDING]?.length ?? 0) > 0 &&
                  (groupedResults[MATCH_TYPES.TIMELINE]?.length ?? 0) > 0 && <CommandSeparator />}
                {(groupedResults[MATCH_TYPES.TIMELINE]?.length ?? 0) > 0 &&
                  groupedResults[MATCH_TYPES.TIMELINE] && (
                    <CommandGroup heading="TIMELINE">
                      {(groupedResults[MATCH_TYPES.TIMELINE] ?? []).map((result, index) => (
                        <CommandItem
                          key={`timeline-${index}`}
                          value={getSearchValue(result)}
                          onSelect={() => onResultSelect(result)}
                          className="w-full flex items-start gap-3 rounded-lg cursor-pointer [&_*]:pointer-events-none"
                        >
                          {renderResultContent(result)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
              </>
            )}
          </div>
        </ScrollArea>
      </CommandList>
    </Command>,
    document.body
  )
}
