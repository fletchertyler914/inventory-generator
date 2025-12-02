import { invoke } from '@tauri-apps/api/core';
import type { Note } from '../types/note';

export const noteService = {
  async createNote(
    caseId: string,
    content: string,
    fileId?: string
  ): Promise<Note> {
    return invoke<Note>('create_note', {
      caseId, // Tauri converts camelCase to snake_case automatically
      content,
      fileId, // Tauri converts camelCase to snake_case automatically
    });
  },

  async updateNote(noteId: string, content: string): Promise<void> {
    return invoke('update_note', {
      noteId, // Tauri converts camelCase to snake_case automatically
      content,
    });
  },

  async deleteNote(noteId: string): Promise<void> {
    return invoke('delete_note', {
      noteId, // Tauri converts camelCase to snake_case automatically
    });
  },

  async listNotes(caseId: string, fileId?: string): Promise<Note[]> {
    return invoke<Note[]>('list_notes', {
      caseId, // Tauri converts camelCase to snake_case automatically
      fileId, // Tauri converts camelCase to snake_case automatically
    });
  },

  async toggleNotePinned(noteId: string): Promise<void> {
    return invoke('toggle_note_pinned', {
      noteId, // Tauri converts camelCase to snake_case automatically
    });
  },
};

