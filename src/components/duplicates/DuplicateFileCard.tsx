import { FileText, CheckCircle2, Star, Trash2, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { StatusCell } from '../table/StatusCell';
import type { DuplicateFile } from '@/services/duplicateService';
import { formatBytes } from '@/lib/inventory-utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DuplicateFileCardProps {
  file: DuplicateFile;
  isPrimary: boolean;
  isRecommended?: boolean;
  onKeep: () => void;
  onDelete: () => void;
  onView: () => void;
}

export function DuplicateFileCard({
  file,
  isPrimary,
  isRecommended = false,
  onKeep,
  onDelete,
  onView,
}: DuplicateFileCardProps) {
  return (
    <Card
      className={cn(
        'p-4 transition-all duration-200',
        isPrimary && 'ring-2 ring-primary bg-primary/5',
        isRecommended && !isPrimary && 'ring-2 ring-amber-500/50 bg-amber-500/5'
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm truncate">{file.file_name}</span>
              {isPrimary && (
                <Badge variant="default" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Primary
                </Badge>
              )}
              {isRecommended && !isPrimary && (
                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground break-all mb-2">
              {file.absolute_path}
            </p>
            <p className="text-xs text-muted-foreground">Folder: {file.folder_path}</p>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Size:</span>
            <span className="ml-2 font-mono">{formatBytes(file.file_size)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <div className="mt-1">
              <StatusCell
                status={file.status as any}
                onStatusChange={() => {}}
              />
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>
            <span className="ml-2">{format(new Date(file.created_at * 1000), 'MMM d, yyyy')}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Modified:</span>
            <span className="ml-2">{format(new Date(file.modified_at * 1000), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          {!isPrimary && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onKeep}
                className="flex-1"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Keep
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

