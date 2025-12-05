import { memo } from "react"
import { Loader2 } from "lucide-react"

/**
 * ELITE: Memoized loading state component
 */
export const SearchLoadingState = memo(function SearchLoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Searching...</span>
      </div>
    </div>
  )
})

