import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { duplicateService, type DuplicateGroup } from '@/services/duplicateService';
import { recommendFileToKeep, getNotesCounts, getFindingsCounts } from '@/lib/duplicate-recommendations';
import { toast } from '@/hooks/useToast';
import { DuplicateFileCard } from './DuplicateFileCard';
import { DuplicateDecisionDialog } from './DuplicateDecisionDialog';

interface DuplicateGroupViewProps {
  group: DuplicateGroup;
  caseId: string;
  onBack: () => void;
  onResolved: () => void;
}

export function DuplicateGroupView({ group, caseId, onBack, onResolved }: DuplicateGroupViewProps) {
  const [recommendation, setRecommendation] = useState<{ file_id: string; confidence: number; reasons: string[] } | null>(null);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ type: 'delete' | 'merge'; fileId: string; targetFileId?: string } | null>(null);

  // Load recommendation
  const loadRecommendation = useCallback(async () => {
    try {
      const [notesCounts, findingsCounts] = await Promise.all([
        getNotesCounts(group.files.map(f => f.file_id), caseId),
        getFindingsCounts(group.files.map(f => f.file_id), caseId),
      ]);
      
      const rec = recommendFileToKeep(group.files, notesCounts, findingsCounts);
      setRecommendation(rec);
    } catch (error) {
      const { logError } = require('@/lib/logger');
      logError('Failed to load recommendation', error);
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
    setSelectedAction({ 
      type: mergeToFileId ? 'merge' : 'delete', 
      fileId, 
      ...(mergeToFileId && { targetFileId: mergeToFileId })
    });
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

  // Sort files: primary first, then recommended
  const sortedFiles = [...group.files].sort((a, b) => {
    // Primary files first
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    // Then recommended
    if (recommendation) {
      if (a.file_id === recommendation.file_id && b.file_id !== recommendation.file_id) return -1;
      if (a.file_id !== recommendation.file_id && b.file_id === recommendation.file_id) return 1;
    }
    return 0;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/30 dark:border-border/40 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{primaryFile?.file_name || 'Unknown'}</h3>
          <p className="text-xs text-muted-foreground truncate">{group.count} duplicate files</p>
        </div>
      </div>

      {/* Files List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2.5">
          {sortedFiles.map((file) => (
            <DuplicateFileCard
              key={file.file_id}
              file={file}
              isPrimary={file.is_primary}
              isRecommended={recommendation?.file_id === file.file_id}
              {...(recommendation?.file_id === file.file_id && recommendation ? { recommendationReasons: recommendation.reasons } : {})}
              onKeep={() => handleKeepFile(file.file_id)}
              onDelete={() => {
                const targetFile = recommendedFile || primaryFile;
                handleDeleteFile(file.file_id, file.file_id !== targetFile?.file_id ? targetFile?.file_id : undefined);
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
          {...(selectedAction.targetFileId ? (() => {
            const targetFile = group.files.find(f => f.file_id === selectedAction.targetFileId);
            return targetFile ? { targetFile } : {};
          })() : {})}
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

