import { invoke } from '@tauri-apps/api/core';
import { cachedInvoke, clearCache } from '@/lib/request-cache';
import type { Note } from '../types/note';

export const noteService = {
  async createNote(
    caseId: string,
    content: string,
    fileId?: string
  ): Promise<Note> {
    const result = await invoke<Note>('create_note', {
      caseId, // Tauri converts camelCase to snake_case automatically
      content,
      fileId, // Tauri converts camelCase to snake_case automatically
    });
    // Invalidate note counts cache after creating a note
    clearCache('get_file_note_counts');
    return result;
  },

  async updateNote(noteId: string, content: string): Promise<void> {
    await invoke('update_note', {
      noteId, // Tauri converts camelCase to snake_case automatically
      content,
    });
    // Invalidate note counts cache after updating a note
    clearCache('get_file_note_counts');
  },

  async deleteNote(noteId: string): Promise<void> {
    await invoke('delete_note', {
      noteId, // Tauri converts camelCase to snake_case automatically
    });
    // Invalidate note counts cache after deleting a note
    clearCache('get_file_note_counts');
  },

  async listNotes(caseId: string, fileId?: string): Promise<Note[]> {
    return invoke<Note[]>('list_notes', {
      caseId, // Tauri converts camelCase to snake_case automatically
      fileId, // Tauri converts camelCase to snake_case automatically
    });
  },

  async toggleNotePinned(noteId: string): Promise<void> {
    await invoke('toggle_note_pinned', {
      noteId, // Tauri converts camelCase to snake_case automatically
    });
    // Invalidate note counts cache after toggling pinned status
    clearCache('get_file_note_counts');
  },

  /**
   * Get note counts for all files in a case
   * ELITE: Uses cachedInvoke for automatic caching and deduplication
   * TTL: 30 seconds (frequently changing data, but still cacheable)
   */
  async getFileNoteCounts(caseId: string, forceRefresh?: boolean): Promise<Record<string, number>> {
    if (forceRefresh) {
      const { clearCache } = await import('@/lib/request-cache');
      clearCache('get_file_note_counts');
    }
    return cachedInvoke<Record<string, number>>('get_file_note_counts', { caseId }, 30 * 1000);
  },
};

