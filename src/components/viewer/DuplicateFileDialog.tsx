import { Copy, FileText, AlertTriangle } from 'lucide-react';
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
import type { DuplicateFile } from '@/services/fileService';
import { fileService } from '@/services/fileService';
import { toast } from '@/hooks/useToast';

interface DuplicateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  fileId: string;
  fileName: string;
  duplicates: DuplicateFile[];
  onFileSelect?: (fileId: string) => void;
}

export function DuplicateFileDialog({
  open,
  onOpenChange,
  caseId: _caseId,
  fileId: _fileId,
  fileName,
  duplicates,
  onFileSelect,
}: DuplicateFileDialogProps) {

  if (!open || duplicates.length === 0) {
    return null;
  }

  const handleOpenFile = async (_duplicateFileId: string, duplicatePath: string) => {
    try {
      // Open file in system
      await fileService.openFile(duplicatePath);
    } catch (error) {
      toast({
        title: 'Failed to open file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleSelectFile = (duplicateFileId: string) => {
    if (onFileSelect) {
      onFileSelect(duplicateFileId);
    }
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reviewed':
        return 'text-green-600 dark:text-green-400';
      case 'flagged':
        return 'text-red-600 dark:text-red-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'finalized':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status);
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${color} bg-muted/50`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Files Detected
          </DialogTitle>
          <DialogDescription>
            Found {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} of "{fileName}"
            <br />
            These files have the same content (hash) but are located at different paths.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Duplicate files share the same content. You may want to review which version to keep or
            consolidate them.
          </AlertDescription>
        </Alert>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {/* Current file */}
          <div className="p-3 border rounded-lg bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">Current File</span>
                </div>
                <p className="text-xs text-muted-foreground break-all">{fileName}</p>
              </div>
            </div>
          </div>

          {/* Duplicate files */}
          {duplicates.map((dup) => (
            <div
              key={dup.file_id}
              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm truncate">{dup.file_name}</span>
                    {getStatusBadge(dup.status)}
                  </div>
                  <p className="text-xs text-muted-foreground break-all mb-2">
                    {dup.absolute_path}
                  </p>
                  <p className="text-xs text-muted-foreground">Folder: {dup.folder_path}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenFile(dup.file_id, dup.absolute_path)}
                >
                  Open
                </Button>
                {onFileSelect && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSelectFile(dup.file_id)}
                  >
                    Select
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

