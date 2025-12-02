import { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Edit2, Clock, FileText, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { SettingsDialog } from '../SettingsDialog';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { caseService } from '@/services/caseService';
import { fileService } from '@/services/fileService';
import type { Case } from '@/types/case';
import { format } from 'date-fns';
import { EditCaseDialog } from './EditCaseDialog';
import { DeleteCaseConfirmationDialog } from './DeleteCaseConfirmationDialog';
import { toast } from '@/hooks/useToast';

interface CaseListViewProps {
  onSelectCase: (case_: Case) => void;
  onCreateCase?: () => void;
  currentCaseId?: string;
}

interface CaseWithFileCount extends Case {
  fileCount?: number;
}

export function CaseListView({ onSelectCase, onCreateCase, currentCaseId }: CaseListViewProps) {
  const [cases, setCases] = useState<CaseWithFileCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFileCounts, setLoadingFileCounts] = useState<Set<string>>(new Set());
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingCase, setDeletingCase] = useState<Case | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadCases = async () => {
    try {
      setLoading(true);
      const loadedCases = await caseService.listCases();
      setCases(loadedCases);
      
      // Load file counts for each case
      const counts = new Set<string>();
      loadedCases.forEach(c => counts.add(c.id));
      setLoadingFileCounts(counts);
      
      // Load file counts asynchronously
      loadedCases.forEach(async (case_) => {
        try {
          const count = await fileService.getCaseFileCount(case_.id);
          setCases(prev => prev.map(c => 
            c.id === case_.id ? { ...c, fileCount: count } : c
          ));
        } catch (error) {
          console.error(`Failed to load file count for case ${case_.id}:`, error);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const handleEditCase = (case_: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCase(case_);
    setEditDialogOpen(true);
  };

  const handleEditCaseUpdated = () => {
    loadCases();
  };

  const handleDeleteCaseClick = (case_: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCase(case_);
    setDeleteDialogOpen(true);
  };

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

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-8 border-b border-border flex-shrink-0">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex-1 p-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-48 mb-3" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
            <SettingsDialog />
          </div>
        </div>
      </div>

      {/* Cases List */}
      <ScrollArea className="flex-1 relative z-10">
        <div className="p-8">
          {cases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative p-6 rounded-2xl bg-muted/50 border border-border">
                  <FolderOpen className="h-16 w-16 text-muted-foreground/50" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">No cases yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                Get started by creating your first case to organize and manage your documents
              </p>
              {onCreateCase && (
                <Button size="lg" onClick={onCreateCase} className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first case
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{cases.length}</span>
                  <span>{cases.length === 1 ? 'case' : 'cases'}</span>
                </div>
                {onCreateCase && (
                  <Button onClick={onCreateCase} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    New Case
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cases.map((case_, index) => (
              <Card
                key={case_.id}
                className={cn(
                  "group cursor-pointer transition-all duration-200 animate-fade-in",
                  "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
                  "border-2 hover:border-primary/20",
                  currentCaseId === case_.id && "ring-2 ring-primary border-primary/30 shadow-lg shadow-primary/10"
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                  opacity: 0,
                  animationFillMode: 'forwards'
                }}
                onClick={() => onSelectCase(case_)}
              >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                          <CardTitle className="text-lg font-bold truncate group-hover:text-primary transition-colors">
                            {case_.name}
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs mt-1 line-clamp-2 flex items-start gap-1.5">
                          <FolderOpen className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{case_.folder_path}</span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => handleEditCase(case_, e)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteCaseClick(case_, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {case_.case_id && (
                        <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
                          {case_.case_id}
                        </Badge>
                      )}
                      {case_.department && (
                        <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
                          {case_.department}
                        </Badge>
                      )}
                      {case_.client && (
                        <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
                          {case_.client}
                        </Badge>
                      )}
                      <Badge
                        variant={case_.deployment_mode === 'cloud' ? 'default' : 'outline'}
                        className="text-xs font-medium px-2 py-0.5"
                      >
                        {case_.deployment_mode}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{format(new Date(case_.last_opened_at * 1000), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {loadingFileCounts.has(case_.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-foreground">
                              {case_.fileCount !== undefined ? case_.fileCount.toLocaleString() : '—'}
                            </span>
                            <span className="text-muted-foreground">files</span>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
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

