import { open } from "@tauri-apps/plugin-dialog"
import { Button } from "./ui/button"
import { FolderOpen, CheckCircle2 } from "lucide-react"
import { createAppError, logError, ErrorCode } from "@/lib/error-handler"
import { toast } from "@/hooks/useToast"

interface FolderSelectorProps {
  onFolderSelected: (path: string) => void
  disabled?: boolean
  selectedFolder?: string | null
}

export function FolderSelector({ onFolderSelected, disabled, selectedFolder }: FolderSelectorProps) {
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      })

      if (selected && typeof selected === "string") {
        onFolderSelected(selected)
      }
    } catch (error) {
      const appError = createAppError(error, ErrorCode.INVALID_PATH)
      logError(appError, "FolderSelector")
      toast({
        title: "Failed to select folder",
        description: appError.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-3">
      {selectedFolder && (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded border border-border bg-muted/30">
          <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {selectedFolder.split('/').pop() || selectedFolder}
          </span>
        </div>
      )}
      <Button
        onClick={handleSelectFolder}
        disabled={disabled}
        className="w-full"
      >
        <FolderOpen className="mr-2 h-4 w-4" />
        Select Inventory Folder
      </Button>
    </div>
  )
}
