import { memo } from "react"
import { CommandGroup, CommandItem, CommandSeparator } from "../ui/command"
import type { SearchResult } from "@/services/searchService"
import { ResultItem } from "./ResultItem"

interface ResultGroupProps {
  type: "file" | "note" | "finding" | "timeline"
  results: SearchResult[]
  query: string
  count?: number
  onResultSelect: (result: SearchResult) => void
  getSearchValue: (result: SearchResult) => string
  showSeparator?: boolean
}

/**
 * ELITE: Memoized result group component
 * Eliminates repetitive group rendering code
 */
export const ResultGroup = memo(
  function ResultGroup({
    type,
    results,
    query,
    count,
    onResultSelect,
    getSearchValue,
    showSeparator = false,
  }: ResultGroupProps) {
    if (results.length === 0) return null

    const heading = type.toUpperCase()
    const keyPrefix = type

    return (
      <>
        <CommandGroup
          heading={
            <div className="flex items-center justify-between w-full">
              <span>{heading}</span>
              {count !== undefined && count > 0 && (
                <span className="text-[10px] text-muted-foreground/60 font-normal">
                  {count}
                </span>
              )}
            </div>
          }
        >
          {results.map((result, index) => (
            <CommandItem
              key={`${keyPrefix}-${result.file_id || result.note_id || result.absolute_path || index}`}
              value={getSearchValue(result)}
              onSelect={() => onResultSelect(result)}
              className="p-0 [&_*]:pointer-events-none"
            >
              <ResultItem
                result={result}
                query={query}
                onSelect={onResultSelect}
                getSearchValue={getSearchValue}
              />
            </CommandItem>
          ))}
        </CommandGroup>
        {showSeparator && <CommandSeparator />}
      </>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if results, query, or count changes
    return (
      prevProps.results === nextProps.results &&
      prevProps.query === nextProps.query &&
      prevProps.count === nextProps.count
    )
  }
)

