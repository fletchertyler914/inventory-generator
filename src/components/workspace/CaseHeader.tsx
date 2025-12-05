import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, MoreVertical, FileText, StickyNote, AlertTriangle, Calendar, Plus, FileSearch, FileBarChart, RefreshCw, Search, Copy } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { SearchDialog } from '../search/SearchDialog';
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
  viewMode: 'split' | 'board';
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
  onNoteSelect?: (noteId: string) => void;
  onFindingSelect?: (filePath?: string, findingId?: string) => void;
  onTimelineSelect?: (filePath?: string, timelineEventId?: string) => void;
  onGenerateReport?: () => void;
  onSyncFiles?: () => void;
  isSyncing?: boolean;
  autoSyncEnabled?: boolean;
  onToggleAutoSync?: () => void;
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
  onNoteSelect,
  onFindingSelect,
  onTimelineSelect,
  onGenerateReport,
  onSyncFiles,
  isSyncing = false,
  autoSyncEnabled = false,
  onToggleAutoSync,
}: CaseHeaderProps) {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)

  // Detect platform for keybinding display
  const isMacOS = () => {
    if (typeof navigator === "undefined") return false
    const nav = navigator as Navigator & { userAgentData?: { platform: string } }
    if (nav.userAgentData?.platform) {
      return nav.userAgentData.platform.toLowerCase() === "macos"
    }
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes("mac os x") || userAgent.includes("macintosh")) {
      return true
    }
    const platform = navigator.platform?.toUpperCase() || ""
    return platform.indexOf("MAC") >= 0
  }

  const modifierKey = isMacOS() ? "⌘" : "⌃"

  // Cmd/Ctrl + F: Open search dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      // Don't intercept if user is typing in an input (unless it's the search dialog input)
      if (isInput && !target.closest('[cmdk-input]')) return

      const modifier =
        navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? e.metaKey : e.ctrlKey

      if (modifier && e.key.toLowerCase() === "f") {
        e.preventDefault()
        setSearchDialogOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="h-16 border-b border-border/40 dark:border-border/50 bg-card flex-shrink-0 relative px-3 shadow-sm">
      {/* Left Section - Case Info and Search */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-3 min-w-0">
        <h1 className="text-lg font-semibold truncate">{case_.name}</h1>
        {case_.case_id && (
          <>
            <span className="h-4 w-px bg-border flex-shrink-0" aria-hidden="true" />
            <Badge variant="outline" className="text-xs px-2 py-0.5 flex-shrink-0">
              {case_.case_id}
            </Badge>
          </>
        )}
        <span className="h-4 w-px bg-border flex-shrink-0" aria-hidden="true" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchDialogOpen(true)}
          title={`Search files, notes, findings, timeline (${modifierKey}F)`}
          className="h-8 px-3 gap-2 transition-all duration-200 flex-shrink-0"
        >
          <Search className="h-4 w-4" />
          <span className="text-xs text-muted-foreground font-mono">{modifierKey}F</span>
        </Button>
      </div>

      {/* Right Section - Actions */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Reports/Review button - toggle between report mode and review mode */}
        {onToggleReportMode && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleReportMode}
              title={reportMode ? 'Switch to Review Mode' : 'Switch to Report Mode'}
              className="h-8 w-8 p-0 transition-all duration-200"
            >
              {reportMode ? (
                <FileSearch className="h-4 w-4" />
              ) : (
                <FileBarChart className="h-4 w-4" />
              )}
            </Button>
            {/* Divider after Report/Review toggle if pane toggles are visible */}
            {viewMode === 'split' && !reportMode && (
              <span className="h-4 w-px bg-border flex-shrink-0" aria-hidden="true" />
            )}
          </>
        )}

        {/* Pane toggles - only show in review mode, compact icon-only buttons */}
        {viewMode === 'split' && !reportMode && (
          <>
            <div className="flex items-center gap-1 border border-border/40 dark:border-border/50 rounded-md p-0.5">
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
            {/* Divider after pane toggles */}
            <span className="h-4 w-px bg-border flex-shrink-0" aria-hidden="true" />
          </>
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
            {onSyncFiles && (
              <DropdownMenuItem onClick={onSyncFiles} disabled={isSyncing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Files'}
              </DropdownMenuItem>
            )}
            {onToggleAutoSync && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onToggleAutoSync();
                }}
                onSelect={(e) => {
                  e.preventDefault();
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <Checkbox
                    checked={autoSyncEnabled}
                    onCheckedChange={onToggleAutoSync}
                    className="pointer-events-none"
                  />
                  <span>Auto-sync files</span>
                </div>
              </DropdownMenuItem>
            )}
            {onGenerateReport && items.length > 0 && (
              <DropdownMenuItem onClick={onGenerateReport}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider before Close button */}
        <span className="h-4 w-px bg-border flex-shrink-0" aria-hidden="true" />

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

      {/* Search Dialog */}
      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        caseId={case_.id}
        items={items}
        onFileSelect={onFileOpen}
        onNoteSelect={onNoteSelect}
        onSearchChange={onSearchChange}
        onFindingSelect={onFindingSelect}
        onTimelineSelect={onTimelineSelect}
      />
    </div>
  );
}

