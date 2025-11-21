import { ConfigForm } from "../ConfigForm"
import { InventoryTable } from "../InventoryTable"
import { EmptyState } from "../ui/empty-state"
import { Loader2, FolderOpen, FileText } from "lucide-react"
import type { InventoryItem } from "@/types/inventory"

interface InventoryViewProps {
  items: InventoryItem[]
  onItemsChange: (items: InventoryItem[]) => void
  caseNumber: string
  onCaseNumberChange: (value: string) => void
  onBulkSetDateRcvd: (date: string) => void
  loading: boolean
  selectedFolder: string | null
}

export function InventoryView({
  items,
  onItemsChange,
  caseNumber,
  onCaseNumberChange,
  onBulkSetDateRcvd,
  loading,
  selectedFolder,
}: InventoryViewProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-3" strokeWidth={2} />
        <p className="text-sm text-muted-foreground">Scanning folder...</p>
      </div>
    )
  }

  if (items.length === 0 && selectedFolder) {
    return (
      <EmptyState
        icon={FileText}
        title="No files found"
        description="No files were found in the selected folder. Try selecting a different directory."
      />
    )
  }

  if (items.length === 0 && !selectedFolder) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Get Started"
        description="Select a folder to begin scanning and generating your document inventory"
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-foreground tracking-tight">
          Document Inventory
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Generate comprehensive inventory spreadsheets from your document folders
        </p>
      </div>

      <ConfigForm
        caseNumber={caseNumber}
        onCaseNumberChange={onCaseNumberChange}
        onBulkSetDateRcvd={onBulkSetDateRcvd}
        selectedIndices={[]}
        totalItems={items.length}
      />

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Found <span className="font-semibold text-foreground">{items.length}</span> file{items.length !== 1 ? 's' : ''}
            {selectedFolder && (
              <span className="ml-2 text-muted-foreground">in <span className="font-medium text-foreground">{selectedFolder.split('/').pop()}</span></span>
            )}
          </p>
        </div>
        <InventoryTable items={items} onItemsChange={onItemsChange} />
      </div>
    </div>
  )
}
