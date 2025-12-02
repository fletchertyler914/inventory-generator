import { useState, useCallback } from 'react';
import { fileService } from '@/services/fileService';
import { toast } from './useToast';

interface UseFileChangeWarningOptions {
  caseId?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Hook to check for changed files before bulk operations
 * Returns a function that checks files and shows a warning if any have changed
 */
export function useFileChangeWarning({ caseId, onConfirm, onCancel }: UseFileChangeWarningOptions = {}) {
  const [checking, setChecking] = useState(false);

  const checkAndWarn = useCallback(
    async (fileIds: string[]): Promise<boolean> => {
      if (!caseId || fileIds.length === 0) {
        return true; // No files to check, proceed
      }

      setChecking(true);
      try {
        const changedFiles: string[] = [];
        const checkPromises = fileIds.slice(0, 20).map(async (fileId) => {
          try {
            const status = await fileService.checkFileChanged(fileId);
            if (status.changed) {
              changedFiles.push(fileId);
            }
          } catch {
            // Ignore individual errors
          }
        });

        await Promise.all(checkPromises);

        if (changedFiles.length > 0) {
          toast({
            title: 'Files Modified',
            description: `${changedFiles.length} of ${fileIds.length} selected file${fileIds.length !== 1 ? 's' : ''} have been modified. Consider refreshing them first.`,
            variant: 'warning',
            duration: 5000,
          });

          if (onCancel) {
            onCancel();
          }
          setChecking(false);
          return false;
        }

        if (onConfirm) {
          onConfirm();
        }
        setChecking(false);
        return true;
      } catch (error) {
        console.error('Failed to check file changes:', error);
        // On error, allow operation to proceed
        setChecking(false);
        return true;
      }
    },
    [caseId, onConfirm, onCancel]
  );

  return { checkAndWarn, checking };
}

