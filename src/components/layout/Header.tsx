import { FolderSelector } from "../FolderSelector"
import { ExportDialog } from "../ExportDialog"
import { ThemeToggle } from "../ThemeToggle"
import type { InventoryItem } from "@/types/inventory"

interface HeaderProps {
  onFolderSelected: (path: string) => void
  items: InventoryItem[]
  caseNumber: string
  loading: boolean
}

export function Header({
  onFolderSelected,
  items,
  caseNumber,
  loading,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto px-8 py-5 max-w-[1800px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-0.5 bg-border" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Document Inventory Generator
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <FolderSelector
              onFolderSelected={onFolderSelected}
              disabled={loading}
            />
            <ExportDialog
              items={items}
              caseNumber={caseNumber}
              disabled={items.length === 0}
            />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
