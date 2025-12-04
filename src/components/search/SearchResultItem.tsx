import { memo } from 'react';
import { FileText, StickyNote, AlertTriangle, Calendar, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/services/searchService';
import { TiptapEditor } from '../notes/TiptapEditor';

interface SearchResultItemProps {
  result: SearchResult;
  query: string;
  index: number;
  onSelect: (result: SearchResult) => void;
  isClickable: boolean;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  getFileExtension: (fileName?: string) => string;
}

/**
 * Memoized search result item component
 * Optimized to prevent unnecessary re-renders
 */
export const SearchResultItem = memo(function SearchResultItem({
  result,
  query,
  index,
  onSelect,
  isClickable,
  highlightMatch,
  getFileExtension,
}: SearchResultItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(result);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isClickable) {
      e.stopPropagation();
      onSelect(result);
    }
  };

  const renderContent = () => {
    switch (result.match_type) {
      case 'file': {
        const ext = getFileExtension(result.file_name);
        return (
          <>
            <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-baseline gap-2">
                <div className="text-sm font-medium text-foreground truncate leading-tight">
                  {result.file_name ? highlightMatch(result.file_name, query) : 'Untitled'}
                </div>
                {ext && (
                  <span className="text-[10px] text-muted-foreground/70 font-mono px-1.5 py-0.5 bg-muted/30 rounded flex-shrink-0">
                    {ext}
                  </span>
                )}
              </div>
              {result.folder_path && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                  <Folder className="h-3 w-3 opacity-60 flex-shrink-0" />
                  <span className="truncate">{result.folder_path}</span>
                </div>
              )}
            </div>
          </>
        );
      }

      case 'note': {
        return (
          <>
            <StickyNote className="h-4 w-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Note
              </div>
              {result.note_content && (
                <div className="text-sm text-foreground line-clamp-2 leading-relaxed overflow-hidden max-h-[3rem]">
                  <TiptapEditor
                    content={result.note_content}
                    onChange={() => {}}
                    editable={false}
                    className="pointer-events-none h-auto [&_.ProseMirror]:line-clamp-2 [&_.ProseMirror]:text-sm [&_.ProseMirror]:p-0 [&_.ProseMirror]:prose-sm [&_.ProseMirror]:overflow-hidden [&_.ProseMirror]:text-foreground"
                  />
                </div>
              )}
            </div>
          </>
        );
      }

      case 'finding': {
        return (
          <>
            <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-sm font-medium text-foreground leading-tight">
                {result.file_name ? highlightMatch(result.file_name, query) : 'Finding'}
              </div>
              {result.note_content && (
                <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {highlightMatch(result.note_content, query)}
                </div>
              )}
            </div>
          </>
        );
      }

      case 'timeline': {
        return (
          <>
            <Calendar className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Timeline Event
              </div>
              {result.note_content && (
                <div className="text-sm text-foreground line-clamp-2 leading-relaxed">
                  {highlightMatch(result.note_content, query)}
                </div>
              )}
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  const key = `${result.match_type}-${result.file_id || result.note_id || index}`;

  return (
    <button
      key={key}
      data-search-result
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      disabled={!isClickable}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
        isClickable
          ? 'cursor-pointer hover:bg-muted/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
          : 'cursor-default opacity-50'
      )}
      style={{ pointerEvents: 'auto' }}
    >
      {renderContent()}
    </button>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.result.file_id === nextProps.result.file_id &&
    prevProps.result.note_id === nextProps.result.note_id &&
    prevProps.result.match_type === nextProps.result.match_type &&
    prevProps.result.file_name === nextProps.result.file_name &&
    prevProps.result.note_content === nextProps.result.note_content &&
    prevProps.query === nextProps.query &&
    prevProps.isClickable === nextProps.isClickable &&
    prevProps.index === nextProps.index
  );
});

