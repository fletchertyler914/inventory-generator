import { useState, useEffect, useRef } from 'react';
import { Save, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { TiptapEditor } from './TiptapEditor';
import { noteService } from '@/services/noteService';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import type { Note } from '@/types/note';

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  fileId?: string;
  note?: Note | null;
  onSave: (saved: boolean) => void;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  caseId,
  fileId,
  note,
  onSave,
}: CreateNoteDialogProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const hasUnsavedChanges = useRef(false);
  const lastSavedContent = useRef<string>(''); // Track the last successfully saved content

  // Debounce content changes for auto-save (1.5 second delay)
  const debouncedContent = useDebounce(content, 1500);

  // Initialize content and noteId when dialog opens or note changes
  useEffect(() => {
    if (note) {
      setContent(note.content);
      setNoteId(note.id);
      setSaved(true);
      hasUnsavedChanges.current = false;
      lastSavedContent.current = note.content; // Initialize last saved content
    } else {
      setContent('');
      setNoteId(null);
      setSaved(false);
      hasUnsavedChanges.current = false;
      lastSavedContent.current = ''; // Reset last saved content
    }
    setSaveError(null);
    isInitialMount.current = true;
  }, [note, open]);

  // Auto-save when debounced content changes
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Don't auto-save empty content
    if (!debouncedContent.trim()) {
      setSaved(false);
      return;
    }

    // Don't auto-save if content matches the original note content (for editing existing notes)
    if (note && note.content === debouncedContent.trim()) {
      setSaved(true);
      hasUnsavedChanges.current = false;
      return;
    }

    // Perform auto-save
    const performAutoSave = async () => {
      // Don't save if dialog is closed
      if (!open) return;

      setSaving(true);
      setSaveError(null);
      hasUnsavedChanges.current = false;

      try {
        const savedContent = debouncedContent.trim();
        if (noteId) {
          // Update existing note
          await noteService.updateNote(noteId, savedContent);
          if (open) {
            setSaved(true);
            hasUnsavedChanges.current = false;
            lastSavedContent.current = savedContent; // Update last saved content
            // Don't call onSave here - it would close the dialog
            // onSave will be called when dialog closes to refresh notes list
          }
        } else {
          // Create new note
          const createdNote = await noteService.createNote(
            caseId,
            savedContent,
            fileId
          );
          if (open) {
            setNoteId(createdNote.id);
            setSaved(true);
            hasUnsavedChanges.current = false;
            lastSavedContent.current = savedContent; // Update last saved content
            // Don't call onSave here - it would close the dialog
            // onSave will be called when dialog closes to refresh notes list
          }
        }
      } catch (error) {
        const { logError } = require('@/lib/logger');
        logError('Failed to auto-save note', error);
        if (open) {
          setSaveError('Failed to save note');
          setSaved(false);
          hasUnsavedChanges.current = true;
        }
      } finally {
        if (open) {
          setSaving(false);
        }
      }
    };

    performAutoSave();
  }, [debouncedContent, caseId, fileId, noteId, note, onSave, open]);

  // Track content changes for unsaved indicator
  // Compare against last saved content, not original note content
  useEffect(() => {
    if (saving) return; // Don't update during save operation
    
    const trimmedContent = content.trim();
    const savedContent = lastSavedContent.current;
    
    if (trimmedContent && trimmedContent !== savedContent) {
      hasUnsavedChanges.current = true;
      setSaved(false);
    } else if (trimmedContent === savedContent && savedContent) {
      // Content matches last saved content
      hasUnsavedChanges.current = false;
      setSaved(true);
    } else if (!trimmedContent) {
      // Empty content
      hasUnsavedChanges.current = false;
      setSaved(false);
    }
  }, [content, saving]);

  const handleManualSave = async () => {
    if (!content.trim()) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const savedContent = content.trim();
      if (noteId) {
        await noteService.updateNote(noteId, savedContent);
      } else {
        const createdNote = await noteService.createNote(
          caseId,
          savedContent,
          fileId
        );
        setNoteId(createdNote.id);
      }
      setSaved(true);
      hasUnsavedChanges.current = false;
      lastSavedContent.current = savedContent; // Update last saved content
      // Don't call onSave here - it would close the dialog
      // onSave will be called when dialog closes to refresh notes list
    } catch (error) {
      const { logError } = require('@/lib/logger');
      logError('Failed to save note', error);
      setSaveError('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  // Call onSave when dialog closes to refresh notes list (only if we have saved content)
  const previousOpenRef = useRef(open);
  useEffect(() => {
    // Only call onSave when transitioning from open to closed, and we have a saved note
    if (previousOpenRef.current && !open && (noteId || (note && saved))) {
      // Dialog is closing and we have a saved note, refresh the notes list
      // Note: onSave will also close the dialog, but that's idempotent since it's already closing
      onSave(true);
    }
    previousOpenRef.current = open;
  }, [open, noteId, note, saved, onSave]);

  const getSaveStatusText = () => {
    if (saving) return 'Saving...';
    if (saveError) return 'Save failed';
    if (saved && !hasUnsavedChanges.current) return 'Saved';
    if (hasUnsavedChanges.current) return 'Unsaved changes';
    return '';
  };

  const getSaveStatusIcon = () => {
    if (saving) return <Loader2 className="h-4 w-4 mr-2 animate-spin" />;
    if (saved && !hasUnsavedChanges.current) return <Check className="h-4 w-4 mr-2" />;
    return <Save className="h-4 w-4 mr-2" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit Note' : 'Create Note'}</DialogTitle>
          <DialogDescription>
            {note
              ? 'Changes are saved automatically as you type'
              : 'Start typing to create a note. It will be saved automatically.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="flex-1 min-h-[300px] flex flex-col border border-border/30 dark:border-border/40 rounded-md overflow-hidden">
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder={note ? 'Edit note content...' : 'Write a note...'}
              editable={true}
              className="h-full"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-shrink-0">
            {/* Save status indicator */}
            <div className="flex items-center text-sm text-muted-foreground">
              {content.trim() && (
                <span
                  className={cn(
                    'flex items-center',
                    saving && 'text-primary',
                    saved && !hasUnsavedChanges.current && 'text-green-600 dark:text-green-400',
                    saveError && 'text-destructive'
                  )}
                >
                  {getSaveStatusIcon()}
                  {getSaveStatusText()}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  // onSave will be called by the useEffect when open becomes false
                  onOpenChange(false);
                }}
              >
                Close
              </Button>
              {content.trim() && (
                <Button
                  onClick={handleManualSave}
                  disabled={saving || (saved && !hasUnsavedChanges.current)}
                  variant={saved && !hasUnsavedChanges.current ? 'secondary' : 'default'}
                >
                  {getSaveStatusIcon()}
                  {saving ? 'Saving...' : saved && !hasUnsavedChanges.current ? 'Saved' : 'Save Now'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

