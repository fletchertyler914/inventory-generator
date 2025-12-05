import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription } from '../ui/alert';
import { PanelContainer } from '../panel/PanelContainer';
import { PanelHeader } from '../panel/PanelHeader';
import { PanelContent } from '../panel/PanelContent';
import { PanelEmptyState } from '../panel/PanelEmptyState';
import { duplicateService, type DuplicateGroup } from '@/services/duplicateService';
import { recommendFileToKeep, getNotesCounts, getFindingsCounts } from '@/lib/duplicate-recommendations';
import { toast } from '@/hooks/useToast';
import { DuplicateFileCard } from './DuplicateFileCard';
import { DuplicateDecisionDialog } from './DuplicateDecisionDialog';
import type { DuplicateFile } from '@/services/duplicateService';

interface FileDuplicatePanelProps {
  caseId: string;
  fileId: string;
  fileName: string;
  onClose: () => void;
  onResolved?: () => void;
}

/**
 * ELITE: File-specific duplicate panel
 * 
 * Shows ONLY duplicates for the current file being viewed.
 * Clean, minimal, focused UI for reviewing and resolving duplicates.
 * 
 * Science-backed UX principles:
 * - Single focus: Only show duplicates for current file (reduces cognitive load)
 * - Progressive disclosure: Show recommendation first, details on demand
 * - Clear actions: Keep/Delete with clear consequences
 * - Minimal visual noise: Clean cards, subtle indicators
 */
export function FileDuplicatePanel({
  caseId,
  fileId,
  fileName,
  onClose,
  onResolved,
}: FileDuplicatePanelProps) {
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [recommendation, setRecommendation] = useState<{ file_id: string; confidence: number; reasons: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ type: 'delete' | 'merge'; fileId: string; targetFileId?: string } | null>(null);

  // Load duplicate group for this file
  const loadGroup = useCallback(async () => {
    try {
      setLoading(true);
      const groupData = await duplicateService.getDuplicateGroup(caseId, fileId, true);
      setGroup(groupData);
    } catch (error) {
      console.error('Failed to load duplicate group:', error);
      toast({
        title: 'Failed to load duplicates',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [caseId, fileId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  // Load recommendation
  useEffect(() => {
    if (group && group.files.length > 1) {
      getNotesCounts(group.files.map(f => f.file_id), caseId)
        .then((notesCounts) => {
          return getFindingsCounts(group.files.map(f => f.file_id), caseId)
            .then((findingsCounts) => {
              const rec = recommendFileToKeep(group.files, notesCounts, findingsCounts);
              setRecommendation(rec);
            });
        })
        .catch((error) => {
          console.error('Failed to load recommendation:', error);
        });
    }
  }, [group, caseId]);

  const handleKeepFile = useCallback(async (fileIdToKeep: string) => {
    if (!group) return;
    try {
      await duplicateService.markAsPrimary(fileIdToKeep, group.group_id);
      toast({
        title: 'File marked as primary',
        description: 'This file is now the primary file in the duplicate group',
        variant: 'default',
      });
      loadGroup();
      onResolved?.();
    } catch (error) {
      toast({
        title: 'Failed to mark as primary',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [group, loadGroup, onResolved]);

  const handleDeleteFile = useCallback((fileIdToDelete: string, mergeToFileId?: string) => {
    setSelectedAction({ type: mergeToFileId ? 'merge' : 'delete', fileId: fileIdToDelete, targetFileId: mergeToFileId });
    setDecisionDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedAction || !group) return;

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
      loadGroup();
      onResolved?.();
    } catch (error) {
      toast({
        title: 'Failed to remove duplicate',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [selectedAction, caseId, group, loadGroup, onResolved]);

  if (loading) {
    return (
      <PanelContainer>
        <PanelHeader title="Duplicates" onClose={onClose} />
        <PanelContent>
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading duplicates...</div>
          </div>
        </PanelContent>
      </PanelContainer>
    );
  }

  if (!group || group.files.length <= 1) {
    return (
      <PanelContainer>
        <PanelHeader title="Duplicates" onClose={onClose} />
        <PanelContent>
          <PanelEmptyState
            icon={CheckCircle2}
            title="No Duplicates"
            description="This file is unique. No duplicate files found."
          />
        </PanelContent>
      </PanelContainer>
    );
  }

  const currentFile = group.files.find(f => f.file_id === fileId) || group.files[0];
  const otherFiles = group.files.filter(f => f.file_id !== fileId);
  const recommendedFile = recommendation ? group.files.find(f => f.file_id === recommendation.file_id) : null;

  return (
    <PanelContainer>
      <PanelHeader 
        title="Duplicates" 
        count={otherFiles.length}
        onClose={onClose}
      />
      <PanelContent>
        <div className="p-4 space-y-4">
            {/* Recommendation Banner - Subtle, informative */}
            {recommendation && recommendedFile && (
              <Alert variant="default" className="bg-primary/5 border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="space-y-2">
                  <p className="text-xs font-medium text-primary">
                    Recommended: Keep "{recommendedFile.file_name}"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {recommendation.reasons.join(' • ')}
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleKeepFile(recommendedFile.file_id)}
                    className="mt-2 h-7 text-xs"
                  >
                    Keep This File
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Current File (being viewed) */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current File
              </p>
              <DuplicateFileCard
                file={currentFile}
                isPrimary={currentFile.is_primary}
                isRecommended={recommendation?.file_id === currentFile.file_id}
                onKeep={() => handleKeepFile(currentFile.file_id)}
                onDelete={() => {
                  toast({
                    title: 'Cannot delete current file',
                    description: 'Please select a different file to delete',
                    variant: 'default',
                  });
                }}
                onView={() => {
                  // Current file is already being viewed
                }}
              />
            </div>

            {/* Duplicate Files */}
            {otherFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Duplicate Files ({otherFiles.length})
                </p>
                {otherFiles.map((file) => (
                  <DuplicateFileCard
                    key={file.file_id}
                    file={file}
                    isPrimary={file.is_primary}
                    isRecommended={recommendation?.file_id === file.file_id}
                    onKeep={() => handleKeepFile(file.file_id)}
                    onDelete={() => {
                      const targetFile = recommendedFile || currentFile;
                      handleDeleteFile(
                        file.file_id,
                        file.file_id !== targetFile?.file_id ? targetFile?.file_id : undefined
                      );
                    }}
                    onView={() => {
                      // Would navigate to file - handled by parent
                      toast({
                        title: 'View file',
                        description: 'File viewing would be implemented here',
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

        {/* Decision Dialog */}
        {selectedAction && group && (
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
      </PanelContent>
    </PanelContainer>
  );
}

