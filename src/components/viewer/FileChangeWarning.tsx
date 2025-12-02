import { useState } from 'react';
import { AlertTriangle, RefreshCw, X, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import type { FileChangeStatus } from '@/services/fileService';
import type { FileStatus } from '@/types/inventory';
import { format } from 'date-fns';

interface FileChangeWarningProps {
  fileId: string;
  fileStatus?: FileStatus;
  changeStatus: FileChangeStatus;
  onRefresh: () => Promise<void>;
  onDismiss: () => void;
  onViewDuplicates?: () => void;
  hasDuplicates?: boolean;
  duplicateDialogOpen?: boolean;
  onDuplicateDialogOpenChange?: (open: boolean) => void;
}

export function FileChangeWarning({
  fileId: _fileId,
  fileStatus = 'unreviewed',
  changeStatus,
  onRefresh,
  onDismiss,
  onViewDuplicates,
  hasDuplicates = false,
  duplicateDialogOpen = false,
  onDuplicateDialogOpenChange,
}: FileChangeWarningProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !changeStatus.changed) {
    return null;
  }

  if (!changeStatus.file_exists) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>File Not Found</AlertTitle>
        <AlertDescription>
          This file has been deleted or moved. It cannot be viewed.
        </AlertDescription>
      </Alert>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      setDismissed(true);
    } catch (error) {
      console.error('Failed to refresh file:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp * 1000), 'MMM d, yyyy h:mm a');
  };

  // Determine warning level and message based on file status
  let variant: 'default' | 'destructive' = 'default';
  let title = 'File Modified';
  let description = '';
  let showRefresh = true;
  let refreshLabel = 'Refresh File';

  switch (fileStatus) {
    case 'unreviewed':
      variant = 'default';
      title = 'File Updated';
      description = 'This file has been updated. Refreshing automatically...';
      // Auto-refresh for unreviewed files
      if (!isRefreshing) {
        handleRefresh();
      }
      return null; // Don't show banner, auto-refresh

    case 'in_progress':
      variant = 'default';
      title = 'File Modified';
      description = 'This file has been modified. Refresh to see the latest version?';
      refreshLabel = 'Refresh File';
      break;

    case 'reviewed':
      variant = 'destructive';
      title = 'File Modified Since Review';
      description = `This file has been modified since it was reviewed. Refreshing will update the file and reset status to 'In Progress' (notes preserved).`;
      refreshLabel = 'Refresh & Reset to In Progress';
      break;

    case 'flagged':
      variant = 'destructive';
      title = 'File Modified Since Review';
      description = `This file has been modified since it was flagged. Refreshing will update the file and reset status to 'In Progress' (notes and flags preserved).`;
      refreshLabel = 'Refresh & Reset to In Progress';
      break;

    case 'finalized':
      variant = 'destructive';
      title = 'File Modified Since Finalization';
      description = `This file has been modified since it was finalized. Choose an action:`;
      refreshLabel = 'Refresh & Reset to In Progress';
      break;

    default:
      variant = 'default';
      title = 'File Modified';
      description = 'This file has been modified. Refresh to see the latest version?';
  }

  return (
    <Alert variant={variant} className="m-4 border-l-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        
        {changeStatus.current_modified && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              <span className="font-medium">Last synced:</span>{' '}
              {formatTimestamp(changeStatus.stored_modified)}
            </div>
            <div>
              <span className="font-medium">Current modified:</span>{' '}
              {formatTimestamp(changeStatus.current_modified)}
            </div>
            {changeStatus.current_size !== changeStatus.stored_size && (
              <div>
                <span className="font-medium">Size changed:</span>{' '}
                {changeStatus.stored_size.toLocaleString()} bytes →{' '}
                {changeStatus.current_size?.toLocaleString()} bytes
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {showRefresh && (
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              variant={variant === 'destructive' ? 'destructive' : 'default'}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {refreshLabel}
            </Button>
          )}
          {hasDuplicates && (onViewDuplicates || onDuplicateDialogOpenChange) && (
            <Button
              onClick={() => {
                if (onDuplicateDialogOpenChange) {
                  onDuplicateDialogOpenChange(true);
                } else if (onViewDuplicates) {
                  onViewDuplicates();
                }
              }}
              size="sm"
              variant="outline"
              disabled={duplicateDialogOpen}
            >
              <Copy className="h-4 w-4 mr-2" />
              {duplicateDialogOpen ? 'Viewing Duplicates...' : `View Duplicates (${hasDuplicates ? '1+' : '0'})`}
            </Button>
          )}
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
          >
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

