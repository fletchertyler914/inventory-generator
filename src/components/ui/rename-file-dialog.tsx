import { useState, useEffect, useMemo } from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Input } from './input';
import { Label } from './label';
import { validateFilename, extractFilename, extractExtension, getFilenameWithoutExtension } from '@/lib/file-validation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

interface RenameFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  currentFileName: string;
  fileType?: string; // File extension/type from database (e.g., "PNG", "PDF")
  onConfirm: (newName: string) => Promise<void>;
  onSyncFirst?: () => Promise<void>;
}

export function RenameFileDialog({
  open,
  onOpenChange,
  currentPath,
  currentFileName,
  fileType,
  onConfirm,
  onSyncFirst,
}: RenameFileDialogProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Get extension from file_type property (from database) or fallback to parsing filename
  // ELITE: Use file_type directly to avoid parsing issues with complex filenames
  const fileExtension = useMemo(() => {
    if (fileType) {
      // fileType is stored as uppercase (e.g., "PNG", "PDF")
      const ext = fileType.toLowerCase().trim();
      return ext ? `.${ext}` : '';
    }
    // Fallback: try to extract from filename (may fail for complex names)
    return extractExtension(currentFileName);
  }, [fileType, currentFileName]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Initialize with just the name part (without extension) for better UX
      const nameWithoutExt = getFilenameWithoutExtension(currentFileName);
      setNewName(nameWithoutExt);
      setError(null);
      setLoading(false);
    } else {
      setNewName('');
      setError(null);
    }
  }, [open, currentFileName]);

  // Real-time validation
  useEffect(() => {
    if (!open || !newName) {
      setError(null);
      return;
    }

    // Construct full filename with extension for validation
    const fullName = newName.trim() + fileExtension;
    const validation = validateFilename(fullName);
    if (!validation.valid) {
      setError(validation.error || 'Invalid filename');
    } else if (fullName === currentFileName) {
      setError('New name must be different from current name');
    } else {
      setError(null);
    }
  }, [newName, currentFileName, open, fileExtension]);

  const handleConfirm = async () => {
    if (loading) return;

    // Construct full filename with extension
    const fullName = newName.trim() + fileExtension;
    
    // Final validation
    const validation = validateFilename(fullName);
    if (!validation.valid) {
      setError(validation.error || 'Invalid filename');
      return;
    }

    if (fullName === currentFileName) {
      setError('New name must be different from current name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(fullName);
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
      
      // ELITE: Check if error indicates stale file and show recovery options
      if (errorMessage.includes('modified externally') || errorMessage.includes('deleted externally') || errorMessage.includes('sync first')) {
        setError(
          `${errorMessage}\n\n` +
          (onSyncFirst ? 'Click "Sync First" to update the file, then try again.' : 'Please sync the case first, then try again.')
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const fullName = newName.trim() + fileExtension;
    if (e.key === 'Enter' && !error && fullName !== currentFileName && !loading) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <DialogDescription>
            Enter a new name for the file. The file will be renamed on the filesystem and in the database.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="filename">File Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filename"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoFocus
                className={error ? 'border-destructive' : ''}
                placeholder="Enter new name"
              />
              {fileExtension && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {fileExtension}
                </span>
              )}
            </div>
            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Current path: {currentPath}
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
          {error && (error.includes('sync first') || error.includes('modified externally') || error.includes('deleted externally')) && onSyncFirst && (
            <Button
              variant="secondary"
              onClick={async () => {
                setLoading(true);
                try {
                  await onSyncFirst();
                  setError(null);
                  // Retry rename after sync
                  await handleConfirm();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to sync file');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              Sync First
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={loading || !!error || (newName.trim() + fileExtension) === currentFileName || !newName.trim()}
          >
            {loading ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

