import { memo } from "react"
import { FileText } from "lucide-react"

/**
 * ELITE: Memoized empty results state component
 */
export const SearchEmptyResults = memo(function SearchEmptyResults() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted/30 mb-3">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-sm font-medium text-foreground mb-1">No results found</div>
      <div className="text-xs text-muted-foreground/70 max-w-xs mx-auto">
        Try a different search term or check your spelling
      </div>
    </div>
  )
})

