import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { AlertTriangle } from "lucide-react"

interface LargeFolderWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function LargeFolderWarningDialog({
  open,
  onOpenChange,
  fileCount,
  onConfirm,
  onCancel,
}: LargeFolderWarningDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10 dark:bg-yellow-400/10">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Large Folder Detected
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            This folder contains <span className="font-semibold text-foreground">{fileCount.toLocaleString()}</span> file{fileCount !== 1 ? 's' : ''}.
            Loading this many files may take a moment and could impact performance.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Would you like to proceed with loading all {fileCount.toLocaleString()} file{fileCount !== 1 ? 's' : ''}?
          </p>
        </div>
        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="default"
          >
            Continue Loading
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

