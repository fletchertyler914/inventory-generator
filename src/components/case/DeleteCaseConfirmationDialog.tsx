import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteCaseConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteCaseConfirmationDialog({
  open,
  onOpenChange,
  caseName,
  onConfirm,
  loading = false,
}: DeleteCaseConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Delete Case</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Are you sure you want to delete <span className="font-semibold text-foreground">{caseName}</span>?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. This will permanently delete the case and all associated files, notes, findings, and timeline events.
            </p>
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
            {loading ? 'Deleting...' : 'Delete Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

