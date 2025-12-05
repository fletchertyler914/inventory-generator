import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Copy, Trash2, Eye, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { duplicateService, type DuplicateGroup, type DuplicateFile } from '@/services/duplicateService';
import { recommendFileToKeep, getNotesCounts, getFindingsCounts } from '@/lib/duplicate-recommendations';
import { formatBytes } from '@/lib/inventory-utils';
import { toast } from '@/hooks/useToast';
import { DuplicateFileCard } from './DuplicateFileCard';
import { DuplicateDecisionDialog } from './DuplicateDecisionDialog';
import { format } from 'date-fns';
import { StatusCell } from '../table/StatusCell';

interface DuplicateGroupViewProps {
  group: DuplicateGroup;
  caseId: string;
  onBack: () => void;
  onResolved: () => void;
}

export function DuplicateGroupView({ group, caseId, onBack, onResolved }: DuplicateGroupViewProps) {
  const [recommendation, setRecommendation] = useState<{ file_id: string; confidence: number; reasons: string[] } | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(true);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ type: 'delete' | 'merge'; fileId: string; targetFileId?: string } | null>(null);

  // Load recommendation
  const loadRecommendation = useCallback(async () => {
    try {
      setLoadingRecommendation(true);
      const [notesCounts, findingsCounts] = await Promise.all([
        getNotesCounts(group.files.map(f => f.file_id), caseId),
        getFindingsCounts(group.files.map(f => f.file_id), caseId),
      ]);
      
      const rec = recommendFileToKeep(group.files, notesCounts, findingsCounts);
      setRecommendation(rec);
    } catch (error) {
      console.error('Failed to load recommendation:', error);
    } finally {
      setLoadingRecommendation(false);
    }
  }, [group.files, caseId]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  const handleKeepFile = useCallback(async (fileId: string) => {
    try {
      await duplicateService.markAsPrimary(fileId, group.group_id);
      toast({
        title: 'File marked as primary',
        description: 'This file is now the primary file in the duplicate group',
        variant: 'default',
      });
      onResolved();
    } catch (error) {
      toast({
        title: 'Failed to mark as primary',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [group.group_id, onResolved]);

  const handleDeleteFile = useCallback((fileId: string, mergeToFileId?: string) => {
    setSelectedAction({ type: mergeToFileId ? 'merge' : 'delete', fileId, targetFileId: mergeToFileId });
    setDecisionDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedAction) return;

    try {
      await duplicateService.removeDuplicate(
        selectedAction.fileId,
        caseId,
        selectedAction.targetFileId
      );
      toast({
        title: 'Duplicate removed',
        description: selectedAction.targetFileId 
          ? 'File removed and metadata merged' 
          : 'File removed from case',
        variant: 'default',
      });
      setDecisionDialogOpen(false);
      setSelectedAction(null);
      onResolved();
    } catch (error) {
      toast({
        title: 'Failed to remove duplicate',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [selectedAction, caseId, onResolved]);

  const primaryFile = group.files.find(f => f.is_primary) || group.files[0];
  const recommendedFile = recommendation ? group.files.find(f => f.file_id === recommendation.file_id) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/40 dark:border-border/50 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{primaryFile.file_name}</h3>
          <p className="text-xs text-muted-foreground truncate">{group.count} duplicate files</p>
        </div>
      </div>

      {/* Recommendation Banner */}
      {recommendation && recommendedFile && (
        <div className="p-3 bg-primary/10 border-b border-border/40 dark:border-border/50 flex-shrink-0">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary mb-1">
                Recommended: Keep "{recommendedFile.file_name}"
              </p>
              <p className="text-xs text-muted-foreground">
                {recommendation.reasons.join(', ')}
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleKeepFile(recommendedFile.file_id)}
            >
              Keep This
            </Button>
          </div>
        </div>
      )}

      {/* Files Comparison */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {group.files.map((file) => (
            <DuplicateFileCard
              key={file.file_id}
              file={file}
              isPrimary={file.is_primary}
              isRecommended={recommendation?.file_id === file.file_id}
              onKeep={() => handleKeepFile(file.file_id)}
              onDelete={() => {
                const targetFile = recommendedFile || primaryFile;
                handleDeleteFile(file.file_id, file.file_id !== targetFile?.file_id ? targetFile?.file_id : undefined);
              }}
              onView={() => {
                // Navigate to file - this would be handled by parent
                toast({
                  title: 'View file',
                  description: 'File viewing would be implemented here',
                });
              }}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Decision Dialog */}
      {selectedAction && (
        <DuplicateDecisionDialog
          open={decisionDialogOpen}
          onOpenChange={setDecisionDialogOpen}
          fileToDelete={group.files.find(f => f.file_id === selectedAction.fileId)!}
          targetFile={selectedAction.targetFileId ? group.files.find(f => f.file_id === selectedAction.targetFileId) : undefined}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDecisionDialogOpen(false);
            setSelectedAction(null);
          }}
        />
      )}
    </div>
  );
}

