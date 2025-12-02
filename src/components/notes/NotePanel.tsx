import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Pin, PinOff, Plus, Trash2, Save, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { noteService } from '@/services/noteService';
import type { Note } from '@/types/note';
import { useDebounce } from '@/hooks/useDebounce';
import { TiptapEditor } from './TiptapEditor';

interface NotePanelProps {
  caseId: string;
  fileId?: string | undefined;
  onClose?: () => void;
}

export function NotePanel({ caseId, fileId, onClose }: NotePanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  // Load notes
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const loadedNotes = await noteService.listNotes(caseId, fileId);
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId, fileId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Auto-save debounced content
  const debouncedContent = useDebounce(editingContent, 1000);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSaveNote = useCallback(async (noteId: string, content: string) => {
    try {
      await noteService.updateNote(noteId, content);
      setNotes(prev =>
        prev.map(n => (n.id === noteId ? { ...n, content, updated_at: Date.now() } : n))
      );
      setEditingNoteId(null);
      setEditingContent('');
    } catch (_error) {
      console.error('Failed to save note:', _error);
    }
  }, []);

  // Auto-save when debounced content changes
  useEffect(() => {
    const currentNote = notes.find(n => n.id === editingNoteId);
    if (editingNoteId && debouncedContent !== '' && debouncedContent !== currentNote?.content) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        handleSaveNote(editingNoteId, debouncedContent);
      }, 500);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [debouncedContent, editingNoteId, notes, handleSaveNote]);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const note = await noteService.createNote(caseId, newNoteContent.trim(), fileId);
      setNotes(prev => [note, ...prev]);
      setNewNoteContent('');
      setIsCreating(false);
    } catch (_error) {
      console.error('Failed to create note:', _error);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await noteService.deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setEditingContent('');
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePinned = async (noteId: string) => {
    try {
      await noteService.toggleNotePinned(noteId);
      setNotes(prev =>
        prev.map(n => (n.id === noteId ? { ...n, pinned: !n.pinned } : n))
      );
    } catch (error) {
      console.error('Failed to toggle pinned status:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-semibold">
          {fileId ? 'File Notes' : 'Case Notes'}
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {/* Create new note */}
          {isCreating ? (
            <div className="space-y-2">
              <TiptapEditor
                content={newNoteContent}
                onChange={setNewNoteContent}
                placeholder="Write a note..."
                editable={true}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateNote}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewNoteContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          )}

          <Separator />

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No notes yet. Click &quot;Add Note&quot; to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    'p-3 rounded-lg border border-border bg-background',
                    note.pinned && 'border-primary/50 bg-primary/5'
                  )}
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <TiptapEditor
                        content={editingContent}
                        onChange={setEditingContent}
                        placeholder="Edit note..."
                        editable={true}
                        onExport={() => {
                          // Export handled by TiptapEditor
                        }}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveNote(note.id, editingContent)}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div
                          className="text-sm text-foreground flex-1 cursor-pointer min-w-0"
                          onClick={() => handleStartEdit(note)}
                        >
                          <div className="prose prose-sm dark:prose-invert max-w-none pointer-events-none">
                            <TiptapEditor
                              content={note.content}
                              onChange={() => {}}
                              editable={false}
                              className="pointer-events-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleTogglePinned(note.id)}
                            title={note.pinned ? 'Unpin note' : 'Pin note'}
                          >
                            {note.pinned ? (
                              <Pin className="h-3 w-3 text-primary" />
                            ) : (
                              <PinOff className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Export note
                              const blob = new Blob([note.content], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `note-${note.id}-${Date.now()}.html`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            title="Export note"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteNote(note.id)}
                            title="Delete note"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(note.updated_at * 1000).toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

