import { Button } from '../ui/button';
import { X, Plus, LayoutGrid, Table, FileText, StickyNote, AlertTriangle, Calendar } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ThemeToggle } from '../ThemeToggle';
import { SearchBar } from '../search/SearchBar';
import type { Case } from '@/types/case';
import type { InventoryItem } from '@/types/inventory';

interface CaseHeaderProps {
  case: Case;
  fileCount: number;
  items: InventoryItem[];
  onClose: () => void;
  onAddFiles: () => void;
  viewMode: 'split' | 'table' | 'timeline';
  onViewModeChange: (mode: 'split' | 'table' | 'timeline') => void;
  viewingFile: InventoryItem | null;
  tableVisible?: boolean;
  onToggleTable?: () => void;
  notesVisible?: boolean;
  onToggleNotes?: () => void;
  findingsVisible?: boolean;
  onToggleFindings?: () => void;
  timelineVisible?: boolean;
  onToggleTimeline?: () => void;
  onFileOpen?: (filePath: string) => void;
  onSearchChange?: (query: string) => void;
  onFindingSelect?: () => void;
  onTimelineSelect?: () => void;
}

export function CaseHeader({
  case: case_,
  fileCount,
  items,
  onClose,
  onAddFiles,
  viewMode,
  onViewModeChange,
  viewingFile,
  tableVisible = true,
  onToggleTable,
  notesVisible = false,
  onToggleNotes,
  findingsVisible = false,
  onToggleFindings,
  timelineVisible = false,
  onToggleTimeline,
  onFileOpen,
  onSearchChange,
  onFindingSelect,
  onTimelineSelect,
}: CaseHeaderProps) {
  return (
    <div className="h-16 border-b border-border bg-card flex-shrink-0 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate leading-tight">{case_.name}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            {case_.case_id && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {case_.case_id}
              </Badge>
            )}
            {case_.case_id && (
              <span className="h-3 w-px bg-border" aria-hidden="true" />
            )}
            <span className="text-xs text-muted-foreground">
              {fileCount} file{fileCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 flex items-center justify-center px-8">
        <SearchBar
          caseId={case_.id}
          items={items}
          onFileSelect={onFileOpen}
          onSearchChange={onSearchChange}
          onFindingSelect={onFindingSelect}
          onTimelineSelect={onTimelineSelect}
        />
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Contextual view mode toggle */}
        {viewingFile ? (
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-r-none transition-all duration-200"
              onClick={() => onViewModeChange('split')}
              title="Split view (File viewer + Table)"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Split
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-l-none transition-all duration-200"
              onClick={() => onViewModeChange('table')}
              title="Table view only"
            >
              <Table className="h-4 w-4 mr-1" />
              Table
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Table view (select a file to enable split view)"
          >
            <Table className="h-4 w-4 mr-1" />
            Table View
          </Button>
        )}

        {/* Pane toggles - only show in split view, compact icon-only buttons */}
        {viewMode === 'split' && (
          <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
            {onToggleTable && (
              <Button
                variant={tableVisible ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleTable}
                title="Toggle table panel (Cmd/Ctrl+B)"
                className="h-8 w-8 p-0 transition-all duration-200"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            {onToggleNotes && (
              <Button
                variant={notesVisible ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleNotes}
                title="Toggle notes panel (Cmd/Ctrl+N)"
                className="h-8 w-8 p-0 transition-all duration-200"
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            )}
            {onToggleFindings && (
              <Button
                variant={findingsVisible ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleFindings}
                title="Toggle findings panel"
                className="h-8 w-8 p-0 transition-all duration-200"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            )}
            {onToggleTimeline && (
              <Button
                variant={timelineVisible ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleTimeline}
                title="Toggle timeline panel"
                className="h-8 w-8 p-0 transition-all duration-200"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onAddFiles}
          title="Add files to case"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Files
        </Button>

        <ThemeToggle />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          title="Close case and return to case list"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

