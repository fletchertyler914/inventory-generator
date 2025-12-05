import { Copy, FileText, AlertTriangle, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import type { DuplicateFile as OldDuplicateFile } from '@/services/fileService';
import { fileService } from '@/services/fileService';
import { duplicateService } from '@/services/duplicateService';
import { toast } from '@/hooks/useToast';
import { DuplicateFileCard } from '../duplicates/DuplicateFileCard';
import { useState, useEffect, useCallback } from 'react';
import { recommendFileToKeep, getNotesCounts, getFindingsCounts } from '@/lib/duplicate-recommendations';

interface DuplicateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  fileId: string;
  fileName: string;
  duplicates: OldDuplicateFile[];
  onFileSelect?: (fileId: string) => void;
  onManageAll?: () => void;
}

export function DuplicateFileDialog({
  open,
  onOpenChange,
  caseId,
  fileId,
  fileName,
  duplicates: oldDuplicates,
  onFileSelect,
  onManageAll,
}: DuplicateFileDialogProps) {
  const [group, setGroup] = useState<{ files: any[]; group_id: string } | null>(null);
  const [recommendation, setRecommendation] = useState<{ file_id: string; confidence: number; reasons: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  // Load duplicate group using new service
  useEffect(() => {
    if (open && fileId && caseId) {
      setLoading(true);
      duplicateService.getDuplicateGroup(caseId, fileId, true)
        .then((groupData) => {
          if (groupData) {
            setGroup(groupData);
          } else {
            // Fallback to old format if new service doesn't return data
            setGroup({
              group_id: 'legacy',
              files: oldDuplicates.map(d => ({
                file_id: d.file_id,
                file_name: d.file_name,
                absolute_path: d.absolute_path,
                folder_path: d.folder_path,
                status: d.status,
                file_size: 0,
                created_at: 0,
                modified_at: 0,
                is_primary: false,
              })),
            });
          }
        })
        .catch((error) => {
          console.error('Failed to load duplicate group:', error);
          // Fallback to old format
          setGroup({
            group_id: 'legacy',
            files: oldDuplicates.map(d => ({
              file_id: d.file_id,
              file_name: d.file_name,
              absolute_path: d.absolute_path,
              folder_path: d.folder_path,
              status: d.status,
              file_size: 0,
              created_at: 0,
              modified_at: 0,
              is_primary: false,
            })),
          });
        })
        .finally(() => setLoading(false));
    }
  }, [open, fileId, caseId, oldDuplicates]);

  // Load recommendation
  useEffect(() => {
    if (group && group.files.length > 0) {
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

  if (!open || (!group && oldDuplicates.length === 0)) {
    return null;
  }

  const files = group?.files || [];
  const currentFile = files.find(f => f.file_id === fileId) || {
    file_id: fileId,
    file_name: fileName,
    absolute_path: '',
    folder_path: '',
    status: 'unreviewed',
    file_size: 0,
    created_at: 0,
    modified_at: 0,
    is_primary: false,
  };
  const otherFiles = files.filter(f => f.file_id !== fileId);

  const handleOpenFile = async (duplicatePath: string) => {
    try {
      await fileService.openFile(duplicatePath);
    } catch (error) {
      toast({
        title: 'Failed to open file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleSelectFile = (duplicateFileId: string) => {
    if (onFileSelect) {
      onFileSelect(duplicateFileId);
    }
    onOpenChange(false);
  };

  const handleKeepFile = useCallback(async (fileIdToKeep: string) => {
    if (!group) return;
    try {
      await duplicateService.markAsPrimary(fileIdToKeep, group.group_id);
      toast({
        title: 'File marked as primary',
        description: 'This file is now the primary file in the duplicate group',
        variant: 'default',
      });
      // Reload group
      const updatedGroup = await duplicateService.getDuplicateGroup(caseId, fileId, true);
      if (updatedGroup) {
        setGroup(updatedGroup);
    }
    } catch (error) {
      toast({
        title: 'Failed to mark as primary',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [group, caseId, fileId]);

  const recommendedFile = recommendation ? files.find(f => f.file_id === recommendation.file_id) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Files Detected
          </DialogTitle>
          <DialogDescription>
            Found {otherFiles.length} duplicate{otherFiles.length !== 1 ? 's' : ''} of "{fileName}"
            <br />
            These files have the same content (hash) but are located at different paths.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Duplicate files share the same content. Review which version to keep or consolidate them.
            </span>
            {onManageAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onManageAll();
                }}
                className="ml-4"
              >
                <Settings className="h-4 w-4 mr-1" />
                Manage All
              </Button>
            )}
          </AlertDescription>
        </Alert>

        {recommendation && recommendedFile && (
          <Alert variant="default" className="mb-4 bg-primary/10 border-primary/20">
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
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
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {/* Current file */}
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

          {/* Duplicate files */}
          {otherFiles.map((dup) => (
            <DuplicateFileCard
              key={dup.file_id}
              file={dup}
              isPrimary={dup.is_primary}
              isRecommended={recommendation?.file_id === dup.file_id}
              onKeep={() => handleKeepFile(dup.file_id)}
              onDelete={() => {
                // Would open delete dialog - simplified for now
                toast({
                  title: 'Delete duplicate',
                  description: 'Delete functionality would be implemented here',
                  variant: 'default',
                });
              }}
              onView={() => handleSelectFile(dup.file_id)}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

