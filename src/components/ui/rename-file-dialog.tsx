import { useState, useEffect } from 'react';
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
import { validateFilename, extractFilename } from '@/lib/file-validation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

interface RenameFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  currentFileName: string;
  onConfirm: (newName: string) => Promise<void>;
  onSyncFirst?: () => Promise<void>;
}

export function RenameFileDialog({
  open,
  onOpenChange,
  currentPath,
  currentFileName,
  onConfirm,
  onSyncFirst,
}: RenameFileDialogProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setNewName(currentFileName);
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

    const validation = validateFilename(newName);
    if (!validation.valid) {
      setError(validation.error || 'Invalid filename');
    } else if (newName === currentFileName) {
      setError('New name must be different from current name');
    } else {
      setError(null);
    }
  }, [newName, currentFileName, open]);

  const handleConfirm = async () => {
    if (loading) return;

    // Final validation
    const validation = validateFilename(newName);
    if (!validation.valid) {
      setError(validation.error || 'Invalid filename');
      return;
    }

    if (newName === currentFileName) {
      setError('New name must be different from current name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(newName);
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
    if (e.key === 'Enter' && !error && newName !== currentFileName && !loading) {
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
            <Input
              id="filename"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
              className={error ? 'border-destructive' : ''}
            />
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
            disabled={loading || !!error || newName === currentFileName || !newName.trim()}
          >
            {loading ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

