import { useState, useEffect, useCallback } from "react"
import { Pin, PinOff, Plus, Trash2, Download, Edit2 } from "lucide-react"
import { Button } from "../ui/button"
import { ScrollArea } from "../ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { cn } from "@/lib/utils"
import { noteService } from "@/services/noteService"
import type { Note } from "@/types/note"
import { TiptapEditor } from "./TiptapEditor"
import { PanelContainer } from "../panel/PanelContainer"
import { PanelHeader } from "../panel/PanelHeader"
import { PanelContent } from "../panel/PanelContent"
import { PanelEmptyState } from "../panel/PanelEmptyState"
import { PanelCard } from "../panel/PanelCard"
import { CreateNoteDialog } from "./CreateNoteDialog"

interface NotePanelProps {
  caseId: string
  fileId?: string | undefined
  onClose?: () => void
  initialNoteId?: string | null
}

export function NotePanel({ caseId, fileId, onClose, initialNoteId }: NotePanelProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [viewingNoteId, setViewingNoteId] = useState<string | null>(initialNoteId || null)

  // Load notes
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true)
      const loadedNotes = await noteService.listNotes(caseId, fileId)
      setNotes(loadedNotes)
    } catch (error) {
      console.error("Failed to load notes:", error)
    } finally {
      setLoading(false)
    }
  }, [caseId, fileId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Update viewingNoteId when initialNoteId prop changes
  useEffect(() => {
    if (initialNoteId !== undefined) {
      setViewingNoteId(initialNoteId)
    }
  }, [initialNoteId])

  const handleCreate = useCallback(() => {
    setEditingNote(null)
    setCreateDialogOpen(true)
  }, [])

  const handleEdit = useCallback((note: Note) => {
    setViewingNoteId(null) // Close view dialog if open
    setEditingNote(note)
    setCreateDialogOpen(true)
  }, [])

  const handleDialogClose = useCallback(
    (saved: boolean) => {
      setCreateDialogOpen(false)
      setEditingNote(null)
      if (saved) {
        loadNotes()
      }
    },
    [loadNotes]
  )

  const handleViewNote = (note: Note) => {
    setViewingNoteId(note.id)
  }

  // Extract plain text preview from HTML content
  const getNotePreview = (htmlContent: string, maxLength: number = 80) => {
    const div = document.createElement("div")
    div.innerHTML = htmlContent
    const text = div.textContent || div.innerText || ""
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await noteService.deleteNote(noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      if (editingNoteId === noteId) {
        setEditingNoteId(null)
        setEditingContent("")
      }
    } catch (error) {
      console.error("Failed to delete note:", error)
    }
  }

  const handleTogglePinned = async (noteId: string) => {
    try {
      await noteService.toggleNotePinned(noteId)
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n)))
    } catch (error) {
      console.error("Failed to toggle pinned status:", error)
    }
  }


  // Sort notes: pinned first, then by updated_at
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updated_at - a.updated_at
  })

  if (loading) {
    return (
      <PanelContainer>
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading notes...</div>
        </div>
      </PanelContainer>
    )
  }

  return (
    <PanelContainer>
      <PanelHeader
        title={fileId ? "File Notes" : "Case Notes"}
        count={notes.length}
        onCreate={handleCreate}
        createButtonLabel=""
        {...(onClose && { onClose })}
      />

      <PanelContent>
        {/* Notes list */}
        {sortedNotes.length === 0 ? (
          <PanelEmptyState
            icon={Plus}
            title="No notes yet"
            description="Click the + button above to create your first note"
            onAction={handleCreate}
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

                <div className={cn(note.pinned && "pr-6", "min-w-0 overflow-hidden w-full")}>
                    {/* Condensed note preview */}
                    <div 
                      className="text-xs text-foreground/90 line-clamp-2 mb-1.5 break-words overflow-hidden"
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {getNotePreview(note.content)}
                    </div>

                    {/* Minimal footer */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Timestamp */}
                      <div className="text-[10px] text-muted-foreground/60">
                        {new Date(note.updated_at * 1000).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>

                      {/* Action buttons */}
                      <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:!bg-muted/60 dark:hover:!bg-muted/60"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(note)
                          }}
                          title="Edit note"
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:!bg-muted/60 dark:hover:!bg-muted/60"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTogglePinned(note.id)
                          }}
                          title={note.pinned ? "Unpin note" : "Pin note"}
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
                          className="h-5 w-5 p-0 hover:!bg-muted/60 dark:hover:!bg-muted/60"
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const { save } = await import("@tauri-apps/plugin-dialog")
                              const { invoke } = await import("@tauri-apps/api/core")
                              const filePath = await save({
                                defaultPath: `note-${Date.now()}.html`,
                                filters: [
                                  {
                                    name: "HTML",
                                    extensions: ["html"],
                                  },
                                ],
                              })
                              if (filePath) {
                                await invoke("write_file_text", {
                                  path: filePath,
                                  content: note.content,
                                })
                              }
                            } catch (error) {
                              console.error("Failed to export note:", error)
                              // Fallback to browser download
                              const blob = new Blob([note.content], { type: "text/html" })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement("a")
                              a.href = url
                              a.download = `note-${note.id}-${Date.now()}.html`
                              document.body.appendChild(a)
                              a.click()
                              document.body.removeChild(a)
                              URL.revokeObjectURL(url)
                            }
                          }}
                          title="Export note"
                        >
                          <Download className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:!text-destructive hover:!bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNote(note.id)
                          }}
                          title="Delete note"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </PanelCard>
            ))}
          </div>
        )}
      </PanelContent>

      {/* View Note Dialog */}
      {(() => {
        const viewingNote = viewingNoteId ? notes.find((n) => n.id === viewingNoteId) : null
        if (!viewingNote) return null
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
                      {new Date(viewingNote.updated_at * 1000).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-4"
                    onClick={() => {
                      setViewingNoteId(null)
                      handleEdit(viewingNote)
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
              <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-border/40 dark:border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const { save } = await import("@tauri-apps/plugin-dialog")
                      const { invoke } = await import("@tauri-apps/api/core")
                      const filePath = await save({
                        defaultPath: `note-${Date.now()}.html`,
                        filters: [
                          {
                            name: "HTML",
                            extensions: ["html"],
                          },
                        ],
                      })
                      if (filePath) {
                        await invoke("write_file_text", {
                          path: filePath,
                          content: viewingNote.content,
                        })
                      }
                    } catch (error) {
                      console.error("Failed to export note:", error)
                      // Fallback to browser download
                      const blob = new Blob([viewingNote.content], { type: "text/html" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `note-${viewingNote.id}-${Date.now()}.html`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
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
                    handleDeleteNote(viewingNote.id)
                    setViewingNoteId(null)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Create/Edit Dialog */}
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false)
            setEditingNote(null)
          }
        }}
        caseId={caseId}
        fileId={fileId}
        note={editingNote}
        onSave={handleDialogClose}
      />
    </PanelContainer>
  )
}
