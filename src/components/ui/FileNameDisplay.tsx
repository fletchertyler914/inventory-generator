import React, { memo, useMemo } from 'react';
import { Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileExtension } from '@/lib/file-icon-utils';

interface FileNameDisplayProps {
  fileName: string;
  fileType?: string; // File extension/type from database (e.g., "PNG", "PDF") - preferred over parsing filename
  showExtension?: boolean;
  showFolderPath?: boolean;
  folderPath?: string;
  className?: string;
  highlightQuery?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
}

/**
 * Helper function to highlight query matches in text
 */
const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!text || !query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary font-medium px-0.5 rounded"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
};

/**
 * ELITE: Reusable file name display component with proper truncation
 * 
 * Features:
 * - Proper truncation with CSS constraints
 * - Optional extension tag (clean badge style)
 * - Optional folder path (single line, truncated)
 * - Query highlighting support
 * - Memoized for performance
 * - Accessibility: title attribute for full name on hover
 */
export const FileNameDisplay = memo(function FileNameDisplay({
  fileName,
  fileType,
  showExtension = false,
  showFolderPath = false,
  folderPath,
  className,
  highlightQuery,
  icon,
  iconClassName,
}: FileNameDisplayProps) {
  const extension = useMemo(() => {
    if (!showExtension) return null;
    // ELITE: Use file_type from database directly (preferred), fallback to parsing filename
    const ext = fileType ? getFileExtension(fileType) : getFileExtension(fileName);
    return ext ? ext.toUpperCase() : null;
  }, [fileName, fileType, showExtension]);

  const displayName = useMemo(() => {
    if (highlightQuery) {
      return highlightMatch(fileName, highlightQuery);
    }
    return fileName;
  }, [fileName, highlightQuery]);

  return (
    <div className={cn('flex items-start gap-3 min-w-0', className)}>
      {icon && (
        <div className={cn('flex-shrink-0', iconClassName)}>{icon}</div>
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <div
            className="text-sm font-medium text-foreground truncate leading-tight flex-1 min-w-0"
            title={fileName}
          >
            {displayName}
          </div>
          {extension && (
            <span className="text-[10px] text-muted-foreground/70 font-mono px-1.5 py-0.5 bg-muted/30 rounded flex-shrink-0">
              {extension}
            </span>
          )}
        </div>
        {showFolderPath && folderPath && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 min-w-0">
            <Folder className="h-3 w-3 opacity-60 flex-shrink-0" />
            <span className="truncate" title={folderPath}>
              {folderPath}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

