import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FolderOpen, Plus, Briefcase, Search, X, ArrowUpDown, ChevronRight, TestTube, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { SettingsDialog } from '../SettingsDialog';
import { Skeleton } from '../ui/skeleton';
import { caseService } from '@/services/caseService';
import { fileService } from '@/services/fileService';
import type { Case } from '@/types/case';
import { formatDistanceToNow } from 'date-fns';
import { EditCaseDialog } from './EditCaseDialog';
import { DeleteCaseConfirmationDialog } from './DeleteCaseConfirmationDialog';
import { toast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import { CaseListCard } from './CaseListCard';
import { CaseFilters, type CaseFilters as CaseFiltersType } from './CaseFilters';
import { CaseListViewMode } from './CaseListViewMode';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { generateDummyCases, clearDummyCases } from '@/scripts/generateDummyCases';

interface CaseListViewProps {
  onSelectCase: (case_: Case) => void;
  onCreateCase?: () => void;
  currentCaseId?: string;
}

interface CaseWithFileCount extends Case {
  fileCount?: number;
  sources?: string[];
}

type SortOption = 'recent' | 'name' | 'created' | 'files';

const ADAPTIVE_LIST_THRESHOLD = 20;
const RECENT_CASES_DAYS = 7;
const MAX_RECENT_CASES = 5;

export function CaseListView({ onSelectCase, onCreateCase, currentCaseId }: CaseListViewProps) {
  const [cases, setCases] = useState<CaseWithFileCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFileCounts, setLoadingFileCounts] = useState<Set<string>>(new Set());
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingCase, setDeletingCase] = useState<Case | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const [filters, setFilters] = useState<CaseFiltersType>({
    deploymentMode: [],
    departments: [],
    clients: [],
  });
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasAutoSwitchedRef = useRef(false);

  // Auto-switch to list view for 20+ cases (only once on initial load)
  useEffect(() => {
    if (cases.length >= ADAPTIVE_LIST_THRESHOLD) {
      if (!hasAutoSwitchedRef.current && viewMode === 'grid') {
        setViewMode('list');
        hasAutoSwitchedRef.current = true;
      }
    } else {
      // Reset the ref when cases drop below threshold
      hasAutoSwitchedRef.current = false;
    }
  }, [cases.length, viewMode]);

  // Keyboard shortcut: Cmd/Ctrl+F to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      if (isInput && target !== searchInputRef.current) return;
      
      const modifier = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? e.metaKey : e.ctrlKey;
      
      if (modifier && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      const loadedCases = await caseService.listCases();
      setCases(loadedCases);
      
      // Load file counts for each case
      const counts = new Set<string>();
      loadedCases.forEach(c => counts.add(c.id));
      setLoadingFileCounts(counts);
      
      // Load file counts and sources asynchronously
      loadedCases.forEach(async (case_) => {
        try {
          const [count, sources] = await Promise.all([
            fileService.getCaseFileCount(case_.id),
            fileService.listCaseSources(case_.id).catch(() => [] as string[])
          ]);
          setCases(prev => prev.map(c => 
            c.id === case_.id ? { ...c, fileCount: count, sources } : c
          ));
        } catch (error) {
          console.error(`Failed to load data for case ${case_.id}:`, error);
        } finally {
          setLoadingFileCounts(prev => {
            const next = new Set(prev);
            next.delete(case_.id);
            return next;
          });
        }
      });
    } catch (error) {
      console.error('Failed to load cases:', error);
      toast({
        title: 'Failed to load cases',
        description: error instanceof Error ? error.message : 'An error occurred while loading cases.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  // Extract unique departments and clients for filters
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    cases.forEach(c => {
      if (c.department) depts.add(c.department);
    });
    return Array.from(depts).sort();
  }, [cases]);

  const availableClients = useMemo(() => {
    const clients = new Set<string>();
    cases.forEach(c => {
      if (c.client) clients.add(c.client);
    });
    return Array.from(clients).sort();
  }, [cases]);

  // Filter cases based on search and filters
  const filteredCases = useMemo(() => {
    let result = cases;

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.case_id?.toLowerCase().includes(query) ||
        c.department?.toLowerCase().includes(query) ||
        c.client?.toLowerCase().includes(query)
      );
    }

    // Apply deployment mode filter
    if (filters.deploymentMode.length > 0) {
      result = result.filter(c => filters.deploymentMode.includes(c.deployment_mode));
    }

    // Apply department filter
    if (filters.departments.length > 0) {
      result = result.filter(c => c.department && filters.departments.includes(c.department));
    }

    // Apply client filter
    if (filters.clients.length > 0) {
      result = result.filter(c => c.client && filters.clients.includes(c.client));
    }

    return result;
  }, [cases, debouncedSearchQuery, filters]);

  // Sort cases
  const sortedCases = useMemo(() => {
    const sorted = [...filteredCases];
    
    switch (sortOption) {
      case 'recent':
        return sorted.sort((a, b) => b.last_opened_at - a.last_opened_at);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'created':
        return sorted.sort((a, b) => b.created_at - a.created_at);
      case 'files':
        return sorted.sort((a, b) => (b.fileCount ?? 0) - (a.fileCount ?? 0));
      default:
        return sorted;
    }
  }, [filteredCases, sortOption]);

  // Separate recent cases (opened in last 7 days)
  const { recentCases, otherCases } = useMemo(() => {
    const now = Date.now() / 1000;
    const sevenDaysAgo = now - (RECENT_CASES_DAYS * 24 * 60 * 60);
    
    const recent = sortedCases
      .filter(c => c.last_opened_at >= sevenDaysAgo)
      .slice(0, MAX_RECENT_CASES);
    
    const other = sortedCases.filter(c => !recent.includes(c));
    
    return { recentCases: recent, otherCases: other };
  }, [sortedCases]);

  const handleEditCase = useCallback((case_: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCase(case_);
    setEditDialogOpen(true);
  }, []);

  const handleEditCaseUpdated = useCallback(() => {
    loadCases();
  }, []);

  const handleDeleteCaseClick = useCallback((case_: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCase(case_);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingCase) return;

    setDeleting(true);
    try {
      await caseService.deleteCase(deletingCase.id);
      setCases(prev => prev.filter(c => c.id !== deletingCase.id));
      toast({
        title: 'Case deleted',
        description: `"${deletingCase.name}" has been successfully deleted.`,
      });
      setDeleteDialogOpen(false);
      setDeletingCase(null);
    } catch (error) {
      console.error('Failed to delete case:', error);
      toast({
        title: 'Failed to delete case',
        description: error instanceof Error ? error.message : 'An error occurred while deleting the case.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Format relative time
  const getRelativeTime = useCallback((timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-8 border-b border-border flex-shrink-0">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex-1 p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 border rounded-lg">
              <Skeleton className="h-6 w-48 mb-3" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalCases = sortedCases.length;
  const showRecentSection = recentCases.length > 0;

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Header Section */}
      <div className="relative z-10 p-8 border-b border-border flex-shrink-0 bg-background/80 backdrop-blur-sm">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage and organize your document cases
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Dev Tools - Generate Test Cases */}
              {import.meta.env.DEV && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await generateDummyCases();
                        await loadCases();
                      } catch (error) {
                        console.error('Failed to generate dummy cases:', error);
                      }
                    }}
                    title="Generate test cases for development"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Generate Test Cases
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await clearDummyCases();
                        await loadCases();
                      } catch (error) {
                        console.error('Failed to clear dummy cases:', error);
                      }
                    }}
                    title="Clear all test cases"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Test Cases
                  </Button>
                </>
              )}
              <SettingsDialog />
            </div>
          </div>

          {/* Search and Controls Bar */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cases by name, ID, department, or client..."
                  className="pl-9 pr-9 h-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Opened</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="created">Date Created</SelectItem>
                  <SelectItem value="files">File Count</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <CaseListViewMode viewMode={viewMode} onViewModeChange={setViewMode} />

              {/* Create Case Button */}
              {onCreateCase && (
                <Button onClick={onCreateCase} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Case
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <CaseFilters
                filters={filters}
                onFiltersChange={setFilters}
                availableDepartments={availableDepartments}
                availableClients={availableClients}
              />
              {totalCases > 0 && (
                <div className="text-sm text-muted-foreground">
                  {totalCases} {totalCases === 1 ? 'case' : 'cases'}
                  {searchQuery && ` matching "${searchQuery}"`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cases List */}
      <ScrollArea className="flex-1 relative z-10">
        <div className="p-8">
          {totalCases === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative p-6 rounded-2xl bg-muted/50 border border-border">
                  <FolderOpen className="h-16 w-16 text-muted-foreground/50" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery || filters.deploymentMode.length > 0 || filters.departments.length > 0 || filters.clients.length > 0
                  ? 'No cases found'
                  : 'No cases yet'}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                {searchQuery || filters.deploymentMode.length > 0 || filters.departments.length > 0 || filters.clients.length > 0
                  ? 'Try adjusting your search or filters to find what you\'re looking for.'
                  : 'Get started by creating your first case to organize and manage your documents'}
              </p>
              {onCreateCase && (
                <Button size="lg" onClick={onCreateCase} className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first case
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Recent Cases Section */}
              {showRecentSection && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Recently Opened</h2>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {viewMode === 'grid' ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {recentCases.map((case_) => (
                        <CaseListCard
                          key={case_.id}
                          case_={case_}
                          currentCaseId={currentCaseId}
                          loadingFileCount={loadingFileCounts.has(case_.id)}
                          onSelect={onSelectCase}
                          onEdit={handleEditCase}
                          onDelete={handleDeleteCaseClick}
                          isRecent={true}
                          relativeTime={getRelativeTime(case_.last_opened_at)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentCases.map((case_) => (
                        <CaseListCard
                          key={case_.id}
                          case_={case_}
                          currentCaseId={currentCaseId}
                          loadingFileCount={loadingFileCounts.has(case_.id)}
                          onSelect={onSelectCase}
                          onEdit={handleEditCase}
                          onDelete={handleDeleteCaseClick}
                          isRecent={true}
                          relativeTime={getRelativeTime(case_.last_opened_at)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* All Cases Section */}
              {otherCases.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      All Cases
                      {otherCases.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({otherCases.length})
                        </span>
                      )}
                    </h2>
                  </div>
                  {viewMode === 'grid' ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {otherCases.map((case_) => (
                        <CaseListCard
                          key={case_.id}
                          case_={case_}
                          currentCaseId={currentCaseId}
                          loadingFileCount={loadingFileCounts.has(case_.id)}
                          onSelect={onSelectCase}
                          onEdit={handleEditCase}
                          onDelete={handleDeleteCaseClick}
                          relativeTime={getRelativeTime(case_.last_opened_at)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {otherCases.map((case_) => (
                        <CaseListCard
                          key={case_.id}
                          case_={case_}
                          currentCaseId={currentCaseId}
                          loadingFileCount={loadingFileCounts.has(case_.id)}
                          onSelect={onSelectCase}
                          onEdit={handleEditCase}
                          onDelete={handleDeleteCaseClick}
                          relativeTime={getRelativeTime(case_.last_opened_at)}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Edit Case Dialog */}
      <EditCaseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        case_={editingCase}
        onCaseUpdated={handleEditCaseUpdated}
      />

      {/* Delete Case Confirmation Dialog */}
      <DeleteCaseConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        caseName={deletingCase?.name || ''}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
