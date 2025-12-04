import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, StickyNote, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { Input } from '../ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { searchService, type SearchResult } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';
import type { InventoryItem } from '@/types/inventory';

interface SearchBarProps {
  caseId?: string | undefined;
  items: InventoryItem[];
  onFileSelect?: ((filePath: string) => void) | undefined;
  onNoteSelect?: ((noteId: string) => void) | undefined;
  onSearchChange?: ((query: string) => void) | undefined;
  onFindingSelect?: (() => void) | undefined;
  onTimelineSelect?: (() => void) | undefined;
}

// Detect if running on macOS
function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  
  // Try modern API first (userAgentData is experimental and may not be in types)
  const nav = navigator as Navigator & { userAgentData?: { platform: string } };
  if (nav.userAgentData?.platform) {
    return nav.userAgentData.platform.toLowerCase() === "macos";
  }
  
  // Fallback to userAgent
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac os x") || userAgent.includes("macintosh")) {
    return true;
  }
  
  // Fallback to platform
  const platform = navigator.platform?.toUpperCase() || "";
  return platform.indexOf("MAC") >= 0;
}

export function SearchBar({ caseId, items, onFileSelect, onNoteSelect, onSearchChange, onFindingSelect, onTimelineSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  
  // Get modifier key icon for placeholder
  const modifierKey = isMacOS() ? "⌘" : "⌃";
  const placeholder = `Search files and notes... (${modifierKey}K)`;

  // Expose focus method for keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      // Don't trigger if user is typing in an input (unless it's our search input)
      if (isInput && target !== inputRef.current) return;
      
      const modifier = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? e.metaKey : e.ctrlKey;
      
      // Cmd/Ctrl + K: Focus search
      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        // Use setTimeout to ensure the popover is open before focusing
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ELITE: Optimized local search for large datasets (10k+ files)
  // Uses early termination and limits processing for performance
  const searchLocal = useCallback((searchQuery: string): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const lowerQuery = searchQuery.toLowerCase();
    const matches: SearchResult[] = [];
    const maxResults = 50; // Limit results for performance
    const maxProcessed = Math.min(items.length, 5000); // Don't search more than 5k items locally

    // ELITE: Early termination - stop once we have enough high-scoring results
    for (let i = 0; i < maxProcessed && matches.length < maxResults * 2; i++) {
      const item = items[i];
      if (!item) continue; // Skip undefined items
      
      let score = 0;
      
      // Helper to get field from inventory_data
      const getInventoryField = (item: InventoryItem, field: string): string => {
        if (!item.inventory_data) return '';
        try {
          const data = JSON.parse(item.inventory_data);
          return data[field] || '';
        } catch {
          return '';
        }
      };

      // Fast path: check file_name first (most common search target)
      const fileNameLower = item.file_name.toLowerCase();
      if (fileNameLower.includes(lowerQuery)) {
        score += 10;
      } else {
        // Only check other fields if name doesn't match
        const docDesc = getInventoryField(item, 'document_description').toLowerCase();
        const docType = getInventoryField(item, 'document_type').toLowerCase();
        const notes = getInventoryField(item, 'notes').toLowerCase();
        if (docDesc.includes(lowerQuery)) score += 5;
        if (docType.includes(lowerQuery)) score += 3;
        if (notes.includes(lowerQuery)) score += 2;
      }

      if (score > 0) {
        matches.push({
          file_name: item.file_name,
          folder_path: item.folder_path,
          absolute_path: item.absolute_path,
          match_type: 'file',
          rank: score,
        });
      }
    }

    // Sort and limit results
    return matches.sort((a, b) => b.rank - a.rank).slice(0, maxResults);
  }, [items]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        if (caseId) {
          // Use database FTS5 search
          const dbResults = await searchService.searchAll(caseId, debouncedQuery);
          setResults(dbResults);
        } else {
          // Fallback to local search
          const localResults = searchLocal(debouncedQuery);
          setResults(localResults);
        }
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to local search on error
        const localResults = searchLocal(debouncedQuery);
        setResults(localResults);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, caseId, searchLocal]);

  const handleResultClick = (result: SearchResult) => {
    if (result.match_type === 'file' && result.absolute_path && onFileSelect) {
      onFileSelect(result.absolute_path);
      setOpen(false);
      setQuery('');
    } else if (result.match_type === 'note' && result.note_id && onNoteSelect) {
      onNoteSelect(result.note_id);
      setOpen(false);
      setQuery('');
    } else if (result.match_type === 'finding' && onFindingSelect) {
      onFindingSelect();
      setOpen(false);
      setQuery('');
    } else if (result.match_type === 'timeline' && onTimelineSelect) {
      onTimelineSelect();
      setOpen(false);
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              setOpen(true);
              if (onSearchChange) {
                onSearchChange(value);
              }
            }}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-10 pr-10 h-11 text-base"
          />
          {query && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                setResults([]);
                if (onSearchChange) {
                  onSearchChange('');
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="!w-[700px] min-w-[700px] max-w-[700px] p-0 bg-popover text-popover-foreground dark:bg-popover dark:text-popover-foreground border-border shadow-lg" 
        align="center"
        sideOffset={8}
        style={{
          width: "700px",
          minWidth: "700px",
          maxWidth: "700px",
        }}
      >
        <div className="flex flex-col bg-popover min-h-[200px]">
          {query && (
            <div className="p-3 border-b border-border bg-popover">
              <div className="text-sm text-muted-foreground">
                {loading ? 'Searching...' : results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'No results'}
              </div>
            </div>
          )}
          {!query && (
            <div className="p-3 border-b border-border bg-popover">
              <div className="text-sm text-muted-foreground">
                Start typing to search files and notes...
              </div>
            </div>
          )}
          <ScrollArea className="max-h-[600px] bg-popover flex-1">
            <div className="p-2 bg-popover min-h-[150px]">
              {loading ? (
                <div className="flex items-center justify-center py-12 bg-popover">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 && query ? (
                <div className="text-center py-12 text-sm text-muted-foreground bg-popover">
                  No results found
                </div>
              ) : !query ? (
                <div className="text-center py-12 text-sm text-muted-foreground bg-popover">
                  Type to search across files, notes, findings, and timeline events
                </div>
              ) : (
                <div className="space-y-0.5 bg-popover">
                  {results.map((result, index) => {
                    const isClickable = 
                      (result.match_type === 'file' && result.absolute_path && onFileSelect) ||
                      (result.match_type === 'note' && result.note_id && onNoteSelect) ||
                      (result.match_type === 'finding' && onFindingSelect) ||
                      (result.match_type === 'timeline' && onTimelineSelect);
                    
                    const getIcon = () => {
                      switch (result.match_type) {
                        case 'file':
                          return <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />;
                        case 'note':
                          return <StickyNote className="h-5 w-5 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />;
                        case 'finding':
                          return <AlertTriangle className="h-5 w-5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />;
                        case 'timeline':
                          return <Calendar className="h-5 w-5 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-0.5" />;
                        default:
                          return <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />;
                      }
                    };
                    
                    const getTitle = () => {
                      if (result.file_name) return result.file_name;
                      if (result.match_type === 'finding') return 'Finding';
                      if (result.match_type === 'timeline') return 'Timeline Event';
                      if (result.match_type === 'note') return 'Note';
                      return 'Result';
                    };
                    
                    const getTypeLabel = () => {
                      switch (result.match_type) {
                        case 'file': return 'File';
                        case 'note': return 'Note';
                        case 'finding': return 'Finding';
                        case 'timeline': return 'Event';
                        default: return result.match_type;
                      }
                    };
                    
                    return (
                      <button
                        key={`${result.match_type}-${result.file_id || result.note_id || index}`}
                        onClick={() => isClickable && handleResultClick(result)}
                        disabled={!isClickable}
                        className={cn(
                          "w-full flex items-start gap-3 rounded-lg px-4 py-3 text-left transition-all duration-200",
                          "border border-transparent",
                          isClickable 
                            ? "cursor-pointer text-foreground hover:bg-muted/50 hover:border-border active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                            : "cursor-default text-muted-foreground opacity-60"
                        )}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="text-base font-semibold truncate text-foreground">
                              {getTitle()}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs font-medium",
                                result.match_type === 'file' && "border-blue-500/30 text-blue-600 dark:text-blue-400",
                                result.match_type === 'note' && "border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
                                result.match_type === 'finding' && "border-orange-500/30 text-orange-600 dark:text-orange-400",
                                result.match_type === 'timeline' && "border-purple-500/30 text-purple-600 dark:text-purple-400"
                              )}
                            >
                              {getTypeLabel()}
                            </Badge>
                          </div>
                          {result.folder_path && (
                            <div className="text-xs text-muted-foreground truncate mb-1.5 flex items-center gap-1">
                              <span className="opacity-60">📁</span>
                              <span>{result.folder_path}</span>
                            </div>
                          )}
                          {result.note_content && (
                            <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {result.note_content}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

