import { Copy, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';

interface DuplicateIngestionNotificationProps {
  duplicateCount: number;
  onReview?: () => void;
  onDismiss?: () => void;
}

export function DuplicateIngestionNotification({
  duplicateCount,
  onReview,
  onDismiss,
}: DuplicateIngestionNotificationProps) {
  if (duplicateCount === 0) {
    return null;
  }

  return (
    <Alert variant="default" className="mt-4">
      <Copy className="h-4 w-4" />
      <AlertTitle>Duplicates Detected</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Found {duplicateCount} duplicate group{duplicateCount !== 1 ? 's' : ''} during ingestion.
        </span>
        <div className="flex items-center gap-2 ml-4">
          {onReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReview}
            >
              Review
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

