import { memo } from "react"

interface SearchErrorStateProps {
  error: Error | null
}

/**
 * ELITE: Memoized error state component
 */
export const SearchErrorState = memo(function SearchErrorState({ error }: SearchErrorStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-sm text-destructive mb-1">Search error</div>
      <div className="text-xs text-muted-foreground/70">
        Please try again or use local search
      </div>
      {error && process.env.NODE_ENV === "development" && (
        <div className="text-xs text-muted-foreground/50 mt-2 font-mono">
          {error.message}
        </div>
      )}
    </div>
  )
})

