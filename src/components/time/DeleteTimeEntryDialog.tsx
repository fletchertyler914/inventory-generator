/**
 * DeleteTimeEntryDialog Component
 * 
 * Confirmation dialog for deleting a time entry (day)
 */

import { AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { format } from "date-fns"

interface DeleteTimeEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryDate: number // Unix timestamp
  totalTime: string // Formatted time string
  segmentCount: number
  onConfirm: () => void
  loading?: boolean
}

export function DeleteTimeEntryDialog({
  open,
  onOpenChange,
  entryDate,
  totalTime,
  segmentCount,
  onConfirm,
  loading = false,
}: DeleteTimeEntryDialogProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  const formattedDate = format(new Date(entryDate * 1000), "MMMM d, yyyy")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Delete Time Entry</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Are you sure you want to delete the time entry for{" "}
            <span className="font-semibold text-foreground">{formattedDate}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
            <p className="text-sm text-muted-foreground mb-2">
              This action cannot be undone. This will permanently delete:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>
                <span className="font-semibold text-foreground">{totalTime}</span> of tracked time
              </li>
              <li>
                <span className="font-semibold text-foreground">{segmentCount}</span> time
                segment{segmentCount !== 1 ? "s" : ""}
              </li>
              <li>All associated billing information</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
