import { memo } from 'react';
import { getFileIcon } from '@/lib/file-icon-utils';
import { FileNameDisplay } from '../ui/FileNameDisplay';

interface FileSearchResultProps {
  fileName?: string | undefined;
  folderPath?: string | undefined;
  query: string;
  iconClassName?: string;
}

/**
 * ELITE: Shared file search result component
 * 
 * Eliminates duplication between SearchBar.tsx and ResultItem.tsx
 * Uses FileNameDisplay for consistent rendering
 * Memoized for performance
 */
export const FileSearchResult = memo(function FileSearchResult({
  fileName,
  folderPath,
  query,
  iconClassName = 'h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5',
}: FileSearchResultProps) {
  const displayFileName = fileName || 'Untitled';
  const icon = getFileIcon(displayFileName, iconClassName);

  return (
    <FileNameDisplay
      fileName={displayFileName}
      showExtension={true}
      showFolderPath={!!folderPath}
      {...(folderPath ? { folderPath } : {})}
      highlightQuery={query}
      icon={icon}
    />
  );
});

