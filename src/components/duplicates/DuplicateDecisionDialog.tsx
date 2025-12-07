import { Trash2, Merge } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import type { DuplicateFile } from '@/services/duplicateService';
import { formatBytes } from '@/lib/inventory-utils';

interface DuplicateDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileToDelete: DuplicateFile;
  targetFile?: DuplicateFile;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateDecisionDialog({
  open,
  onOpenChange,
  fileToDelete,
  targetFile,
  onConfirm,
  onCancel,
}: DuplicateDecisionDialogProps) {
  const isMerge = !!targetFile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMerge ? (
              <>
                <Merge className="h-5 w-5" />
                Merge & Delete
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5" />
                Delete Duplicate
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isMerge
              ? `Merge metadata from "${fileToDelete.file_name}" to "${targetFile.file_name}" and remove the duplicate?`
              : `Remove "${fileToDelete.file_name}" from the case?`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="text-sm">
            <p className="font-medium mb-1">{fileToDelete.file_name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(fileToDelete.file_size)}</p>
          </div>
          {targetFile && (
            <div className="text-sm">
              <p className="font-medium mb-1">Metadata will merge to: {targetFile.file_name}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={isMerge ? 'default' : 'destructive'}
            onClick={onConfirm}
          >
            {isMerge ? (
              <>
                <Merge className="h-4 w-4 mr-2" />
                Merge & Delete
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

