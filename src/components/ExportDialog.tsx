import { useState } from "react"
import { save } from "@tauri-apps/plugin-dialog"
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
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip"
import { FilePlus, FileSpreadsheet, FileText, Code, Loader2 } from "lucide-react"
import { exportInventory } from "@/services/inventoryService"
import { createAppError, logError, ErrorCode } from "@/lib/error-handler"
import { toast } from "@/hooks/useToast"
import { useInventoryStore } from "@/store/inventoryStore"
import type { InventoryItem } from "@/types/inventory"
import { cn } from "@/lib/utils"

interface ExportDialogProps {
  items: InventoryItem[]
  caseNumber: string
  disabled?: boolean | undefined
  onExportComplete?: ((filePath: string, items: InventoryItem[], caseNumber: string | null, folderPath: string | null) => void) | undefined
  selectedFolder?: string | null | undefined
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
}

export function ExportDialog({ items, caseNumber, disabled, onExportComplete, selectedFolder, open: controlledOpen, onOpenChange }: ExportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [format, setFormat] = useState<"xlsx" | "csv" | "json">("xlsx")
  const { setExporting, exporting } = useInventoryStore()

  const handleExport = async () => {
    if (items.length === 0) {
      toast({
        title: "No items to create inventory",
        description: "Please add items to your inventory before creating a file.",
        variant: "warning",
      })
      return
    }

    try {
      setExporting(true)

      const ext = format === "xlsx" ? "xlsx" : format === "csv" ? "csv" : "json"
      const defaultName = `inventory.${ext}`

      const filePath = await save({
        defaultPath: defaultName,
        filters: [
          {
            name: format.toUpperCase(),
            extensions: [ext],
          },
        ],
      })

      if (!filePath) {
        setExporting(false)
        return
      }

      await exportInventory(
        items,
        format,
        filePath,
        caseNumber || null,
        selectedFolder || null
      )

      // Notify parent about export completion for recent inventories
      if (onExportComplete) {
        onExportComplete(filePath, items, caseNumber || null, selectedFolder || null)
      }

      setOpen(false)
      toast({
        title: "Inventory created",
        description: `Successfully created inventory file with ${items.length} item${items.length !== 1 ? 's' : ''} at ${filePath.split(/[/\\]/).pop()}`,
        variant: "success",
      })
    } catch (error) {
      const appError = createAppError(error, ErrorCode.EXPORT_FAILED)
      logError(appError, "ExportDialog")
      toast({
        title: "Failed to create inventory",
        description: appError.message,
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  const formatOptions = [
    { value: "xlsx" as const, label: "XLSX", icon: FileSpreadsheet, desc: "Excel spreadsheet" },
    { value: "csv" as const, label: "CSV", icon: FileText, desc: "Comma-separated values" },
    { value: "json" as const, label: "JSON", icon: Code, desc: "JavaScript Object Notation" },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button 
              disabled={disabled || items.length === 0}
              variant="outline"
              className="w-full"
            >
              <FilePlus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {items.length === 0 
            ? "No items to create inventory" 
            : `Create inventory file with ${items.length} item${items.length !== 1 ? 's' : ''}`}
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create inventory file with {items.length} item{items.length !== 1 ? 's' : ''} in your preferred format
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
              Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((option) => {
                const Icon = option.icon
                const isSelected = format === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded border transition-colors duration-150",
                      isSelected 
                        ? "border-primary bg-muted/60" 
                        : "border-border bg-background hover:bg-muted/40"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div className="text-center">
                      <div className={cn(
                        "text-sm font-semibold",
                        isSelected ? "text-foreground" : "text-foreground"
                      )}>
                        {option.label}
                      </div>
                      <div className={cn(
                        "text-xs mt-0.5",
                        isSelected ? "text-muted-foreground" : "text-muted-foreground/70"
                      )}>
                        {option.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-3">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FilePlus className="mr-2 h-4 w-4" />
                Create
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
