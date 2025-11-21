import { FolderSelector } from "../FolderSelector"
import { ConfigForm } from "../ConfigForm"
import { ExportDialog } from "../ExportDialog"
import { ImportDialog } from "../ImportDialog"
import { SettingsDialog } from "../SettingsDialog"
import { ThemeToggle } from "../ThemeToggle"
import { KeyboardShortcutsHint } from "../KeyboardShortcutsHint"
import { Button } from "../ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip"
import { RefreshCw, FolderOpen, Loader2 } from "lucide-react"
import { openFolder } from "@/services/inventoryService"
import { createAppError, logError, ErrorCode } from "@/lib/error-handler"
import { toast } from "@/hooks/useToast"
import { useInventoryStore } from "@/store/inventoryStore"
import type { InventoryItem } from "@/types/inventory"

interface SidebarContentProps {
  onFolderSelected: (path: string) => void
  items: InventoryItem[]
  caseNumber: string
  onCaseNumberChange: (value: string) => void
  onBulkSetDateRcvd: (date: string, indices?: number[]) => void
  selectedIndices: number[]
  onItemsChange: (items: InventoryItem[]) => void
  loading: boolean
  selectedFolder?: string | null
  onExportComplete?:
    | ((
        filePath: string,
        items: InventoryItem[],
        caseNumber: string | null,
        folderPath: string | null
      ) => void)
    | undefined
  onImportComplete?:
    | ((
        filePath: string,
        items: InventoryItem[],
        caseNumber: string | null,
        folderPath: string | null
      ) => void)
    | undefined
  onFolderPathRestored?: ((folderPath: string) => void) | undefined
  onSyncInventory?: (() => void) | undefined
  exportDialogOpen?: boolean | undefined
  onExportDialogOpenChange?: ((open: boolean) => void) | undefined
  importDialogOpen?: boolean | undefined
  onImportDialogOpenChange?: ((open: boolean) => void) | undefined
  bulkDateInputRef?: React.RefObject<HTMLInputElement> | undefined
}

export function SidebarContent({
  onFolderSelected,
  items,
  caseNumber,
  onCaseNumberChange,
  onBulkSetDateRcvd,
  selectedIndices,
  onItemsChange,
  loading,
  selectedFolder,
  onExportComplete,
  onImportComplete,
  onFolderPathRestored,
  onSyncInventory,
  exportDialogOpen,
  onExportDialogOpenChange,
  importDialogOpen,
  onImportDialogOpenChange,
  bulkDateInputRef,
}: SidebarContentProps) {
  const syncStatus = useInventoryStore((state) => state.syncStatus)
  const syncing = useInventoryStore((state) => state.syncing)

  const getSyncStatusTooltip = () => {
    if (syncing) {
      return "Checking sync status..."
    }
    if (syncStatus === "synced") {
      return "Sync with Folder (Synced)"
    }
    if (syncStatus === "out_of_sync") {
      return "Sync with Folder (Out of Sync)"
    }
    return "Sync with Folder"
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-foreground">Document Inventory</h1>
          <div className="flex items-center gap-2">
            <SettingsDialog />
            <ThemeToggle />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Generate comprehensive inventory spreadsheets
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          {/* Source Folder Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Source Folder
              </label>
              {items.length > 0 && selectedFolder && (
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={async () => {
                          if (!selectedFolder) return
                          try {
                            await openFolder(selectedFolder)
                          } catch (error) {
                            const appError = createAppError(error, ErrorCode.INVALID_PATH)
                            logError(appError, "SidebarContent")
                            toast({
                              title: "Failed to open folder",
                              description: appError.message,
                              variant: "destructive",
                            })
                          }
                        }}
                        disabled={loading || !selectedFolder}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open Folder</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={onSyncInventory}
                        disabled={loading || !selectedFolder}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 relative"
                      >
                        {syncing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {syncStatus && !syncing && (
                          <span
                            className={`absolute top-0 right-0 h-2 w-2 rounded-full ${
                              syncStatus === "synced" ? "bg-green-500" : "bg-red-500"
                            }`}
                            style={{ transform: "translate(25%, -25%)" }}
                          />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{getSyncStatusTooltip()}</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
            <FolderSelector
              onFolderSelected={onFolderSelected}
              disabled={loading}
              selectedFolder={selectedFolder ?? null}
            />
          </div>

          {/* Inventory Operations */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider block">
              Inventory Operations
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ImportDialog
                onItemsChange={onItemsChange}
                onCaseNumberChange={onCaseNumberChange}
                onImportComplete={onImportComplete}
                onFolderPathRestored={onFolderPathRestored}
                selectedFolder={selectedFolder}
                open={importDialogOpen}
                onOpenChange={onImportDialogOpenChange}
              />
              <ExportDialog
                items={items}
                caseNumber={caseNumber}
                disabled={items.length === 0}
                onExportComplete={onExportComplete}
                selectedFolder={selectedFolder}
                open={exportDialogOpen}
                onOpenChange={onExportDialogOpenChange}
              />
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-5">
            <ConfigForm
              caseNumber={caseNumber}
              onCaseNumberChange={onCaseNumberChange}
              onBulkSetDateRcvd={onBulkSetDateRcvd}
              selectedIndices={selectedIndices}
              totalItems={items.length}
              bulkDateInputRef={bulkDateInputRef}
            />
          </div>
        </div>
      </div>

      {/* Footer with Keyboard Shortcuts */}
      <div className="border-t border-border bg-muted/20">
        <div className="p-4 space-y-3">
          <KeyboardShortcutsHint />
          {items.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {items.length} file{items.length !== 1 ? "s" : ""} loaded
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
