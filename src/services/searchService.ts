import { invoke } from '@tauri-apps/api/core';
import { cachedInvoke } from '@/lib/request-cache';

export interface SearchResult {
  file_id?: string;
  file_name?: string;
  folder_path?: string;
  absolute_path?: string;
  note_id?: string;
  note_content?: string;
  match_type: 'file' | 'note' | 'finding' | 'timeline';
  rank: number;
}

export const searchService = {
  async searchFiles(caseId: string, query: string): Promise<SearchResult[]> {
    return invoke<SearchResult[]>('search_files', {
      caseId, // Tauri converts camelCase to snake_case automatically
      query,
    });
  },

  async searchNotes(caseId: string, query: string, fileId?: string): Promise<SearchResult[]> {
    return invoke<SearchResult[]>('search_notes', {
      caseId, // Tauri converts camelCase to snake_case automatically
      query,
      fileId, // Tauri converts camelCase to snake_case automatically
    });
  },

  async searchAll(caseId: string, query: string): Promise<SearchResult[]> {
    return invoke<SearchResult[]>('search_all', {
      caseId, // Tauri converts camelCase to snake_case automatically
      query,
    });
  },
};

