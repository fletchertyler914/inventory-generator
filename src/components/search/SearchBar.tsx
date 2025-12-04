import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Search,
  X,
  FileText,
  StickyNote,
  Loader2,
  AlertTriangle,
  Calendar,
  Folder,
} from "lucide-react"
import { Input } from "../ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { ScrollArea } from "../ui/scroll-area"
import { cn } from "@/lib/utils"
import { searchService, type SearchResult } from "@/services/searchService"
import { useDebounce } from "@/hooks/useDebounce"
import type { InventoryItem } from "@/types/inventory"

interface SearchBarProps {
  caseId?: string | undefined
  items: InventoryItem[]
  onFileSelect?: ((filePath: string) => void) | undefined
  onNoteSelect?: ((noteId: string) => void) | undefined
  onSearchChange?: ((query: string) => void) | undefined
  onFindingSelect?: (() => void) | undefined
  onTimelineSelect?: (() => void) | undefined
}

// Detect if running on macOS
function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false

  // Try modern API first (userAgentData is experimental and may not be in types)
  const nav = navigator as Navigator & { userAgentData?: { platform: string } }
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "macos"
  }

  // Fallback to userAgent
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes("mac os x") || userAgent.includes("macintosh")) {
    return true
  }

  // Fallback to platform
  const platform = navigator.platform?.toUpperCase() || ""
  return platform.indexOf("MAC") >= 0
}

export function SearchBar({
  caseId,
  items,
  onFileSelect,
  onNoteSelect,
  onSearchChange,
  onFindingSelect,
  onTimelineSelect,
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 300)

  // Get modifier key icon for placeholder
  const modifierKey = isMacOS() ? "⌘" : "⌃"
  const placeholder = `Search files, notes, findings, timeline... (${modifierKey}K)`

  // Expose focus method for keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      // Don't trigger if user is typing in an input (unless it's our search input)
      if (isInput && target !== inputRef.current) return

      const modifier = navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + K: Focus search
      if (modifier && e.key.toLowerCase() === "k") {
        e.preventDefault()
        // Only open popover if there's a query, otherwise just focus the input
        if (query.trim().length > 0) {
          setOpen(true)
        }
        // Use setTimeout to ensure the popover is open before focusing
        setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        }, 0)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [query])

  // ELITE: Optimized local search for large datasets (10k+ files)
  // Uses early termination and limits processing for performance
  const searchLocal = useCallback(
    (searchQuery: string): SearchResult[] => {
      if (!searchQuery.trim()) return []

      const lowerQuery = searchQuery.toLowerCase()
      const matches: SearchResult[] = []
      const maxResults = 50 // Limit results for performance
      const maxProcessed = Math.min(items.length, 5000) // Don't search more than 5k items locally

      // ELITE: Early termination - stop once we have enough high-scoring results
      for (let i = 0; i < maxProcessed && matches.length < maxResults * 2; i++) {
        const item = items[i]
        if (!item) continue // Skip undefined items

        let score = 0

        // Helper to get field from inventory_data
        const getInventoryField = (item: InventoryItem, field: string): string => {
          if (!item.inventory_data) return ""
          try {
            const data = JSON.parse(item.inventory_data)
            return data[field] || ""
          } catch {
            return ""
          }
        }

        // Fast path: check file_name first (most common search target)
        const fileNameLower = item.file_name.toLowerCase()
        if (fileNameLower.includes(lowerQuery)) {
          score += 10
        } else {
          // Check standard fields
          const docDesc = getInventoryField(item, "document_description").toLowerCase()
          const docType = getInventoryField(item, "document_type").toLowerCase()
          const notes = getInventoryField(item, "notes").toLowerCase()
          if (docDesc.includes(lowerQuery)) score += 5
          if (docType.includes(lowerQuery)) score += 3
          if (notes.includes(lowerQuery)) score += 2
          
          // Check all custom mapping fields
          try {
            if (item.inventory_data) {
              const data = JSON.parse(item.inventory_data)
              // Search through all fields in inventory_data
              for (const [key, value] of Object.entries(data)) {
                // Skip standard fields we already checked
                if (['document_description', 'document_type', 'notes'].includes(key)) continue
                // Check if value contains query
                if (String(value).toLowerCase().includes(lowerQuery)) {
                  score += 2 // Lower score for custom fields
                  break // Only count once per item
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }

        if (score > 0) {
          matches.push({
            file_name: item.file_name,
            folder_path: item.folder_path,
            absolute_path: item.absolute_path,
            match_type: "file",
            rank: score,
          })
        }
      }

      // Sort and limit results
      return matches.sort((a, b) => b.rank - a.rank).slice(0, maxResults)
    },
    [items]
  )

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    const performSearch = async () => {
      setLoading(true)
      try {
        if (caseId) {
          // Use database FTS5 search
          const dbResults = await searchService.searchAll(caseId, debouncedQuery)
          setResults(dbResults)
        } else {
          // Fallback to local search
          const localResults = searchLocal(debouncedQuery)
          setResults(localResults)
        }
      } catch (error) {
        console.error("Search error:", error)
        // Fallback to local search on error
        const localResults = searchLocal(debouncedQuery)
        setResults(localResults)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery, caseId, searchLocal])

  const handleResultClick = (result: SearchResult) => {
    if (result.match_type === "file" && result.absolute_path && onFileSelect) {
      onFileSelect(result.absolute_path)
      setOpen(false)
      setQuery("")
    } else if (result.match_type === "note" && result.note_id && onNoteSelect) {
      onNoteSelect(result.note_id)
      setOpen(false)
      setQuery("")
    } else if (result.match_type === "finding" && onFindingSelect) {
      onFindingSelect()
      setOpen(false)
      setQuery("")
    } else if (result.match_type === "timeline" && onTimelineSelect) {
      onTimelineSelect()
      setOpen(false)
      setQuery("")
    }
  }

  // Group and sort results intelligently
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
      file: [],
      note: [],
      finding: [],
      timeline: [],
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

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!text || !query) return text
    const parts = text.split(new RegExp(`(${query})`, "gi"))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  // Get file extension
  const getFileExtension = (fileName?: string): string => {
    if (!fileName) return ""
    const parts = fileName.split(".")
    return parts.length > 1 ? (parts[parts.length - 1] || "").toUpperCase() : ""
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    } else if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault()
      const firstResult = document.querySelector("[data-search-result]") as HTMLElement
      firstResult?.focus()
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen: boolean) => {
        setOpen(newOpen)
        // Ensure input maintains focus when popover opens
        if (newOpen && inputRef.current) {
          // Use requestAnimationFrame to ensure focus happens after popover renders
          requestAnimationFrame(() => {
            inputRef.current?.focus()
          })
        }
      }}
    >
      <PopoverTrigger asChild>
        <div
          className="relative w-[600px] border rounded-md bg-background shadow-sm border-border/50 dark:border-border/60"
          onPointerDown={(e) => {
            // If clicking on the input or inside the input area, prevent PopoverTrigger from toggling
            const target = e.target as HTMLElement
            if (
              target.tagName === "INPUT" ||
              target.closest("input") ||
              target === inputRef.current
            ) {
              e.stopPropagation()
              // Only keep popover open if there's a query
              if (query.trim().length > 0) {
                setOpen(true)
              }
            }
          }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value
              setQuery(value)
              // Only open popover if there's a query
              if (value.trim().length > 0) {
                setOpen(true)
                // Ensure input maintains focus after opening popover
                requestAnimationFrame(() => {
                  inputRef.current?.focus()
                })
              } else {
                setOpen(false)
              }
              if (onSearchChange) {
                onSearchChange(value)
              }
            }}
            onKeyDown={handleKeyDown}
            onMouseDown={(e: React.MouseEvent<HTMLInputElement>) => {
              e.stopPropagation()
            }}
            onClick={(e: React.MouseEvent<HTMLInputElement>) => {
              e.stopPropagation()
              // Only open if there's a query
              if (query.trim().length > 0) {
                setOpen(true)
              }
              // Focus the input after a brief delay to ensure it works
              setTimeout(() => {
                inputRef.current?.focus()
              }, 0)
            }}
            onFocus={() => {
              // Only open if there's a query
              if (query.trim().length > 0) {
                setOpen(true)
              }
            }}
            placeholder={placeholder}
            className="pl-10 pr-10 h-11 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {query && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setQuery("")
                setResults([])
                if (onSearchChange) {
                  onSearchChange("")
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
        style={{
          width: "700px",
          minWidth: "700px",
          maxWidth: "700px",
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
                ) : results.length > 0 ? (
                  `${results.length} result${results.length !== 1 ? "s" : ""}`
                ) : (
                  "No results found"
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
              ) : results.length === 0 && query ? (
                <div className="text-center py-16 bg-popover">
                  <div className="text-sm text-muted-foreground mb-1">No results found</div>
                  <div className="text-xs text-muted-foreground/70">
                    Try a different search term
                  </div>
                </div>
              ) : groupedResults ? (
                <div className="space-y-4 bg-popover">
                  {/* Files */}
                  {groupedResults.file.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Files
                      </div>
                      <div className="space-y-1">
                        {groupedResults.file.map((result: SearchResult, index: number) => {
                          const isClickable = result.absolute_path && onFileSelect
                          const ext = getFileExtension(result.file_name)

                          return (
                            <button
                              key={`file-${result.file_id || index}`}
                              data-search-result
                              onClick={() => isClickable && handleResultClick(result)}
                              disabled={!isClickable}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && isClickable) {
                                  handleResultClick(result)
                                }
                              }}
                              className={cn(
                                "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                                isClickable
                                  ? "cursor-pointer hover:bg-muted/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                  : "cursor-default opacity-50"
                              )}
                            >
                              <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-baseline gap-2">
                                  <div className="text-sm font-medium text-foreground truncate leading-tight">
                                    {result.file_name
                                      ? highlightMatch(result.file_name, query)
                                      : "Untitled"}
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
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {groupedResults.note.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Notes
                      </div>
                      <div className="space-y-1">
                        {groupedResults.note.map((result: SearchResult, index: number) => {
                          const isClickable = result.note_id && onNoteSelect

                          return (
                            <button
                              key={`note-${result.note_id || index}`}
                              data-search-result
                              onClick={() => isClickable && handleResultClick(result)}
                              disabled={!isClickable}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && isClickable) {
                                  handleResultClick(result)
                                }
                              }}
                              className={cn(
                                "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                                isClickable
                                  ? "cursor-pointer hover:bg-muted/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                  : "cursor-default opacity-50"
                              )}
                            >
                              <StickyNote className="h-4 w-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Note
                                </div>
                                {result.note_content && (
                                  <div className="text-sm text-foreground line-clamp-2 leading-relaxed">
                                    {highlightMatch(result.note_content, query)}
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Findings */}
                  {groupedResults.finding.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Findings
                      </div>
                      <div className="space-y-1">
                        {groupedResults.finding.map((result: SearchResult, index: number) => {
                          const isClickable = onFindingSelect

                          return (
                            <button
                              key={`finding-${index}`}
                              data-search-result
                              onClick={() => isClickable && handleResultClick(result)}
                              disabled={!isClickable}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && isClickable) {
                                  handleResultClick(result)
                                }
                              }}
                              className={cn(
                                "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                                isClickable
                                  ? "cursor-pointer hover:bg-muted/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                  : "cursor-default opacity-50"
                              )}
                            >
                              <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="text-sm font-medium text-foreground leading-tight">
                                  {result.file_name
                                    ? highlightMatch(result.file_name, query)
                                    : "Finding"}
                                </div>
                                {result.note_content && (
                                  <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {highlightMatch(result.note_content, query)}
                                  </div>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {groupedResults.timeline.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Timeline
                      </div>
                      <div className="space-y-1">
                        {groupedResults.timeline.map((result: SearchResult, index: number) => {
                          const isClickable = onTimelineSelect

                          return (
                            <button
                              key={`timeline-${index}`}
                              data-search-result
                              onClick={() => isClickable && handleResultClick(result)}
                              disabled={!isClickable}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && isClickable) {
                                  handleResultClick(result)
                                }
                              }}
                              className={cn(
                                "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                                isClickable
                                  ? "cursor-pointer hover:bg-muted/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                  : "cursor-default opacity-50"
                              )}
                            >
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
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
