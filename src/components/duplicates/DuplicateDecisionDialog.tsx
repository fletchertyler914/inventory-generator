import { AlertTriangle, Trash2, Merge } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
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
  const spaceSavings = fileToDelete.file_size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMerge ? (
              <>
                <Merge className="h-5 w-5" />
                Merge & Delete Duplicate
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

        <Alert variant="default" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isMerge ? (
              <div className="space-y-2">
                <p>This will:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Merge all notes from the duplicate to the target file</li>
                  <li>Update findings linked to the duplicate file</li>
                  <li>Update timeline events referencing the duplicate</li>
                  <li>Remove the duplicate file from the case</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                <p>This will:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Remove the file from the case (soft delete)</li>
                  <li>Preserve all notes and findings (they remain accessible)</li>
                  <li>Free up {formatBytes(spaceSavings)} of space</li>
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium mb-1">File to remove:</p>
            <p className="text-xs text-muted-foreground break-all">{fileToDelete.absolute_path}</p>
            <p className="text-xs text-muted-foreground mt-1">Size: {formatBytes(fileToDelete.file_size)}</p>
          </div>
          {targetFile && (
            <div className="p-3 rounded-lg border bg-primary/5">
              <p className="text-xs font-medium mb-1">Target file (will receive metadata):</p>
              <p className="text-xs text-muted-foreground break-all">{targetFile.absolute_path}</p>
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

