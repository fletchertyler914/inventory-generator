import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { TiptapEditor } from './TiptapEditor';
import { noteService } from '@/services/noteService';
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

  useEffect(() => {
    if (note) {
      setContent(note.content);
    } else {
      setContent('');
    }
  }, [note, open]);

  const handleSave = async () => {
    if (!content.trim()) {
      return;
    }

    setSaving(true);
    try {
      if (note) {
        await noteService.updateNote(note.id, content.trim());
      } else {
        await noteService.createNote(caseId, content.trim(), fileId);
      }
      onSave(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit Note' : 'Create Note'}</DialogTitle>
          <DialogDescription>
            {note ? 'Update the note content' : 'Add a new note to this case'}
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

          <div className="flex justify-end gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !content.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : note ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

