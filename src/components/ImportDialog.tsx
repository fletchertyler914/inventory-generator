import { useState } from "react"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { Upload, Loader2 } from "lucide-react"
import { importInventory } from "@/services/inventoryService"
import { createAppError, logError, ErrorCode } from "@/lib/error-handler"
import { toast } from "@/hooks/useToast"
import { useInventoryStore } from "@/store/inventoryStore"
import type { InventoryItem } from "@/types/inventory"

interface ImportDialogProps {
  onItemsChange: (items: InventoryItem[]) => void
  onCaseNumberChange: (caseNumber: string) => void
  onImportComplete?: ((filePath: string, items: InventoryItem[], caseNumber: string | null, folderPath: string | null) => void) | undefined
  onFolderPathRestored?: ((folderPath: string) => void) | undefined
  selectedFolder?: string | null | undefined
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
}

export function ImportDialog({ onItemsChange, onCaseNumberChange, onImportComplete, onFolderPathRestored, open: controlledOpen, onOpenChange }: ImportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const { setImporting, importing } = useInventoryStore()

  const handleImport = async () => {
    try {
      setImporting(true)

      const filePath = await openDialog({
        filters: [
          {
            name: "Inventory Files",
            extensions: ["xlsx", "csv", "json"],
          },
        ],
      })

      if (!filePath || typeof filePath !== "string") {
        setImporting(false)
        return
      }

      // Detect format from file extension
      const pathLower = filePath.toLowerCase()
      let format: string | undefined
      if (pathLower.endsWith(".xlsx")) {
        format = "xlsx"
      } else if (pathLower.endsWith(".csv")) {
        format = "csv"
      } else if (pathLower.endsWith(".json")) {
        format = "json"
      }

      const result = await importInventory(filePath, format)

      // Update items and case number
      onItemsChange(result.items)
      if (result.case_number) {
        onCaseNumberChange(result.case_number)
      }
      
      // Notify parent about import completion for recent inventories
      if (onImportComplete) {
        onImportComplete(filePath, result.items, result.case_number, result.folder_path)
      }
      
      // If folder_path was restored from metadata, notify parent to set it
      if (result.folder_path && onFolderPathRestored) {
        onFolderPathRestored(result.folder_path)
      }

      setOpen(false)
      toast({
        title: "Import successful",
        description: `Successfully imported ${result.items.length} item${result.items.length !== 1 ? 's' : ''}`,
        variant: "success",
      })
    } catch (error) {
      const appError = createAppError(error, ErrorCode.IMPORT_FAILED)
      logError(appError, "ImportDialog")
      toast({
        title: "Import failed",
        description: appError.message,
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Inventory</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Load a previously exported inventory file (XLSX, CSV, or JSON)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Select an inventory file to import. The format will be automatically detected from the file extension.
            This will replace your current inventory items.
          </p>
        </div>
        <DialogFooter className="gap-3">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={importing}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
