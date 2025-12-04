import { useState, useEffect, useCallback, useRef } from 'react';
import { Pin, PinOff, Plus, Trash2, Save, Download, Edit2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { noteService } from '@/services/noteService';
import type { Note } from '@/types/note';
import { useDebounce } from '@/hooks/useDebounce';
import { TiptapEditor } from './TiptapEditor';
import { PanelContainer } from '../panel/PanelContainer';
import { PanelHeader } from '../panel/PanelHeader';
import { PanelContent } from '../panel/PanelContent';
import { PanelEmptyState } from '../panel/PanelEmptyState';
import { PanelCard } from '../panel/PanelCard';

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
  const [viewingNoteId, setViewingNoteId] = useState<string | null>(null);

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
    setIsCreating(true);
  };

  const handleSaveNewNote = async () => {
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
    setViewingNoteId(null); // Close view dialog if open
  };

  const handleViewNote = (note: Note) => {
    setViewingNoteId(note.id);
  };

  // Extract plain text preview from HTML content
  const getNotePreview = (htmlContent: string, maxLength: number = 80) => {
    const div = document.createElement('div');
    div.innerHTML = htmlContent;
    const text = div.textContent || div.innerText || '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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

  // Sort notes: pinned first, then by updated_at
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updated_at - a.updated_at;
  });

  if (loading) {
    return (
      <PanelContainer>
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading notes...</div>
        </div>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer>
      <PanelHeader
        title={fileId ? 'File Notes' : 'Case Notes'}
        count={notes.length}
        onCreate={handleCreateNote}
        createButtonLabel="New"
        onClose={onClose}
      />

      <PanelContent>
        {/* Create new note */}
        {isCreating && (
          <div className="space-y-2 p-3 rounded-lg border border-dashed border-border bg-muted/30">
            <TiptapEditor
              content={newNoteContent}
              onChange={setNewNoteContent}
              placeholder="Write a note..."
              editable={true}
            />
            <div className="flex gap-1.5 justify-end pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setIsCreating(false);
                  setNewNoteContent('');
                }}
              >
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSaveNewNote} disabled={!newNoteContent.trim()}>
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {sortedNotes.length === 0 && !isCreating ? (
          <PanelEmptyState
            icon={Plus}
            title="No notes yet"
            description='Click "New" to create your first note'
          />
        ) : (
          <div className="space-y-2.5">
            {sortedNotes.map((note) => (
              <PanelCard
                key={note.id}
                onClick={() => handleViewNote(note)}
                pinned={note.pinned}
                className="group relative"
              >
                {/* Minimal pinned indicator */}
                {note.pinned && (
                  <div className="absolute top-1.5 right-1.5 z-10">
                    <Pin className="h-2.5 w-2.5 text-primary/60" />
                  </div>
                )}

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
                    <div className="flex gap-1.5 justify-end pt-2 border-t border-border/30">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleSaveNote(note.id, editingContent)}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={cn(note.pinned && 'pr-6')}>
                    {/* Condensed note preview */}
                    <div className="text-xs text-foreground/90 line-clamp-2 mb-1.5">
                      {getNotePreview(note.content)}
                    </div>

                    {/* Minimal footer */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Timestamp */}
                      <div className="text-[10px] text-muted-foreground/60">
                        {new Date(note.updated_at * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(note);
                          }}
                          title="Edit note"
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePinned(note.id);
                          }}
                          title={note.pinned ? 'Unpin note' : 'Pin note'}
                        >
                          {note.pinned ? (
                            <Pin className="h-2.5 w-2.5 text-primary" />
                          ) : (
                            <PinOff className="h-2.5 w-2.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-muted"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const { save } = await import('@tauri-apps/plugin-dialog');
                              const { invoke } = await import('@tauri-apps/api/core');
                              const filePath = await save({
                                defaultPath: `note-${Date.now()}.html`,
                                filters: [
                                  {
                                    name: 'HTML',
                                    extensions: ['html'],
                                  },
                                ],
                              });
                              if (filePath) {
                                await invoke('write_file_text', {
                                  path: filePath,
                                  content: note.content,
                                });
                              }
                            } catch (error) {
                              console.error('Failed to export note:', error);
                              // Fallback to browser download
                              const blob = new Blob([note.content], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `note-${note.id}-${Date.now()}.html`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }
                          }}
                          title="Export note"
                        >
                          <Download className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          title="Delete note"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </PanelCard>
            ))}
          </div>
        )}
      </PanelContent>
          
      {/* View Note Dialog */}
      {(() => {
        const viewingNote = viewingNoteId ? notes.find(n => n.id === viewingNoteId) : null;
        if (!viewingNote) return null;
        return (
          <Dialog open={!!viewingNoteId} onOpenChange={(open) => !open && setViewingNoteId(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4 pr-12">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-2">
                      {viewingNote.pinned && <Pin className="h-4 w-4 text-primary" />}
                      Note
                    </DialogTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(viewingNote.updated_at * 1000).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-4"
                    onClick={() => {
                      setViewingNoteId(null);
                      handleStartEdit(viewingNote);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-hidden px-6">
                <ScrollArea className="h-full">
                  <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                    <TiptapEditor
                      content={viewingNote.content}
                      onChange={() => {}}
                      editable={false}
                      className="pointer-events-none"
                    />
                  </div>
                </ScrollArea>
              </div>
              <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const { save } = await import('@tauri-apps/plugin-dialog');
                      const { invoke } = await import('@tauri-apps/api/core');
                      const filePath = await save({
                        defaultPath: `note-${Date.now()}.html`,
                        filters: [
                          {
                            name: 'HTML',
                            extensions: ['html'],
                          },
                        ],
                      });
                      if (filePath) {
                        await invoke('write_file_text', {
                          path: filePath,
                          content: viewingNote.content,
                        });
                      }
                    } catch (error) {
                      console.error('Failed to export note:', error);
                      // Fallback to browser download
                      const blob = new Blob([viewingNote.content], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `note-${viewingNote.id}-${Date.now()}.html`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTogglePinned(viewingNote.id)}
                >
                  {viewingNote.pinned ? (
                    <>
                      <PinOff className="h-4 w-4 mr-1.5" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 mr-1.5" />
                      Pin
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    handleDeleteNote(viewingNote.id);
                    setViewingNoteId(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </PanelContainer>
  );
}

