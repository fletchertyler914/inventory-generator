import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { Button } from "./button"
import { AlertTriangle } from "lucide-react"

interface DeleteFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  onConfirm: () => void
}

export function DeleteFileDialog({
  open,
  onOpenChange,
  fileName,
  onConfirm,
}: DeleteFileDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Remove File from Case</DialogTitle>
              <DialogDescription className="mt-1">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-foreground">
            Are you sure you want to remove <span className="font-semibold">{fileName}</span> from this case?
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            This will remove the file from the case and delete all associated notes, findings, and timeline events.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
          >
            Remove File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

