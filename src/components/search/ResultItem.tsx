import { memo, useMemo } from "react"
import { StickyNote, AlertTriangle, Calendar, Folder } from "lucide-react"
import type { SearchResult } from "@/services/searchService"
import { TiptapSearchViewer } from "./TiptapSearchViewer"
import { MATCH_TYPES } from "./searchConstants"
import { htmlToText } from "@/lib/html-to-text"
import { getFileIcon } from "@/lib/file-icon-utils"

interface ResultItemProps {
  result: SearchResult
  query: string
  onSelect: (result: SearchResult) => void
  getSearchValue: (result: SearchResult) => string
}

// Helper functions (module-level, pure functions)
const highlightMatch = (text: string, query: string): React.ReactNode => {
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
}

const getFileExtension = (fileName?: string): string => {
  if (!fileName) return ""
  const parts = fileName.split(".")
  return parts.length > 1 ? (parts[parts.length - 1] || "").toUpperCase() : ""
}

/**
 * ELITE: Memoized result item component
 * Renders different result types with optimized components
 */
export const ResultItem = memo(
  function ResultItem({ result, query, onSelect }: ResultItemProps) {
    const handleSelect = () => {
      onSelect(result)
    }

    // Memoize rendered content based on result type
    const content = useMemo(() => {
      switch (result.match_type) {
        case MATCH_TYPES.FILE: {
          const ext = getFileExtension(result.file_name)
          return (
            <>
              {getFileIcon(result.file_name || '', 'h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5')}
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
                    <TiptapSearchViewer
                      content={result.note_content}
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
                    {highlightMatch(htmlToText(result.note_content), query)}
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
                    {highlightMatch(htmlToText(result.note_content), query)}
                  </div>
                )}
              </div>
            </>
          )
        }

        default:
          return null
      }
    }, [result, query])

    return (
      <div
        className="w-full flex items-start gap-3 rounded-md cursor-pointer transition-colors [&_*]:pointer-events-none"
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleSelect()
          }
        }}
      >
        {content}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if result or query changes
    return (
      prevProps.result === nextProps.result && prevProps.query === nextProps.query
    )
  }
)

