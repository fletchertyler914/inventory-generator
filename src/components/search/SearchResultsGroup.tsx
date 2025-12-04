import { memo } from 'react';
import type { SearchResult } from '@/services/searchService';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultsGroupProps {
  title: string;
  results: SearchResult[];
  query: string;
  onSelect: (result: SearchResult) => void;
  isClickable: (result: SearchResult) => boolean;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  getFileExtension: (fileName?: string) => string;
}

/**
 * Memoized search results group component
 * Renders a group of search results by type
 */
export const SearchResultsGroup = memo(function SearchResultsGroup({
  title,
  results,
  query,
  onSelect,
  isClickable,
  highlightMatch,
  getFileExtension,
}: SearchResultsGroupProps) {
  if (results.length === 0) return null;

  return (
    <div>
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-1">
        {results.map((result, index) => (
          <SearchResultItem
            key={`${result.match_type}-${result.file_id || result.note_id || index}`}
            result={result}
            query={query}
            index={index}
            onSelect={onSelect}
            isClickable={isClickable(result)}
            highlightMatch={highlightMatch}
            getFileExtension={getFileExtension}
          />
        ))}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if results array reference changes or query changes
  return (
    prevProps.title === nextProps.title &&
    prevProps.query === nextProps.query &&
    prevProps.results === nextProps.results &&
    prevProps.isClickable === nextProps.isClickable &&
    prevProps.highlightMatch === nextProps.highlightMatch &&
    prevProps.getFileExtension === nextProps.getFileExtension &&
    prevProps.onSelect === nextProps.onSelect
  );
});

