import { memo } from "react"
import { FileText, StickyNote, AlertTriangle, Calendar } from "lucide-react"

/**
 * ELITE: Memoized empty state component
 * Shows helpful hints when no query is entered
 */
export const SearchEmptyState = memo(function SearchEmptyState() {
  return (
    <div className="py-12 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-2">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">Search everything</h3>
          <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
            Search across files, notes, findings, and timeline events in your case
          </p>
        </div>
        <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted-foreground/70">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/30">
            <FileText className="h-3.5 w-3.5 text-blue-500/70" />
            <span className="font-medium">Files</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/30">
            <StickyNote className="h-3.5 w-3.5 text-yellow-500/70" />
            <span className="font-medium">Notes</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/30">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500/70" />
            <span className="font-medium">Findings</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/30">
            <Calendar className="h-3.5 w-3.5 text-purple-500/70" />
            <span className="font-medium">Timeline</span>
          </div>
        </div>
      </div>
    </div>
  )
})

