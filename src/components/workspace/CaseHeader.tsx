import { Button } from '../ui/button';
import { X, MoreVertical, FileText, StickyNote, AlertTriangle, Calendar, Plus, FileEdit } from 'lucide-react';
import { Badge } from '../ui/badge';
import { SearchBar } from '../search/SearchBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { Case } from '@/types/case';
import type { InventoryItem } from '@/types/inventory';

interface CaseHeaderProps {
  case: Case;
  fileCount: number;
  items: InventoryItem[];
  onClose: () => void;
  onAddFiles: () => void;
  viewMode: 'split' | 'table';
  viewingFile: InventoryItem | null;
  reportMode?: boolean;
  onToggleReportMode?: () => void;
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
  onGenerateReport?: () => void;
}

export function CaseHeader({
  case: case_,
  fileCount,
  items,
  onClose,
  onAddFiles,
  viewMode,
  viewingFile: _viewingFile,
  reportMode = false,
  onToggleReportMode,
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
  onGenerateReport,
}: CaseHeaderProps) {
  return (
    <div className="h-16 border-b border-border bg-card flex-shrink-0 relative px-6 shadow-sm">
      {/* Left Section - Case Info */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 min-w-0 max-w-[calc(50%-320px)]">
        <h1 className="text-lg font-semibold truncate">{case_.name}</h1>
        {case_.case_id && (
          <>
            <span className="h-4 w-px bg-border flex-shrink-0" aria-hidden="true" />
            <Badge variant="outline" className="text-xs px-2 py-0.5 flex-shrink-0">
              {case_.case_id}
            </Badge>
          </>
        )}
      </div>

      {/* Center: Search Bar - Absolutely centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <SearchBar
          caseId={case_.id}
          items={items}
          onFileSelect={onFileOpen}
          onSearchChange={onSearchChange}
          onFindingSelect={onFindingSelect}
          onTimelineSelect={onTimelineSelect}
        />
      </div>

      {/* Right Section - Actions */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Reports button - toggle report mode */}
        {onToggleReportMode && (
          <Button
            variant={reportMode ? 'default' : 'ghost'}
            size="sm"
            onClick={onToggleReportMode}
            title={reportMode ? 'Switch to Review Mode' : 'Switch to Report Mode'}
            className="h-8 px-3 transition-all duration-200"
          >
            <FileEdit className="h-4 w-4 mr-2" />
            Reports
          </Button>
        )}

        {/* Pane toggles - only show in review mode, compact icon-only buttons */}
        {viewMode === 'split' && !reportMode && (
          <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
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

        {/* More menu - contains Add Files and Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 transition-all duration-200"
              title="More options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onAddFiles}>
              <Plus className="h-4 w-4 mr-2" />
              Add Files
            </DropdownMenuItem>
            {onGenerateReport && items.length > 0 && (
              <DropdownMenuItem onClick={onGenerateReport}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          title="Close case and return to case list"
          className="h-8 w-8 p-0 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 active:scale-[0.98]"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

