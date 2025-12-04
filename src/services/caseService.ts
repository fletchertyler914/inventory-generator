import { safeInvoke } from '@/lib/tauri-utils';
import { cachedInvoke, clearCache } from '@/lib/request-cache';
import type { Case } from '../types/case';

export const caseService = {
  async createCase(
    name: string,
    sources: string[],
    caseId?: string,
    department?: string,
    client?: string
  ): Promise<Case> {
    const result = await safeInvoke<Case>('create_case', {
      name,
      caseId, // Tauri converts camelCase to snake_case automatically
      department,
      client,
      sources, // Array of file/folder paths
    });
    // Clear cases list cache
    clearCache('list_cases');
    return result;
  },

  async getOrCreateCase(folderPath: string): Promise<Case> {
    return safeInvoke<Case>('get_or_create_case', {
      folderPath, // Tauri converts camelCase to snake_case automatically
    });
  },

  /**
   * List all cases
   * Cached for 1 minute to reduce redundant queries
   */
  async listCases(): Promise<Case[]> {
    return cachedInvoke<Case[]>('list_cases', {}, 60 * 1000);
  },

  async getCase(caseId: string): Promise<Case> {
    return safeInvoke<Case>('get_case', {
      caseId, // Tauri converts camelCase to snake_case automatically
    });
  },

  async updateCaseMetadata(
    caseId: string,
    updates: {
      name?: string;
      caseId?: string;
      department?: string;
      client?: string;
    }
  ): Promise<void> {
    return safeInvoke('update_case_metadata', {
      caseId, // Tauri converts camelCase to snake_case automatically
      ...updates,
    });
  },

  async deleteCase(caseId: string): Promise<void> {
    await safeInvoke('delete_case', {
      caseId, // Tauri converts camelCase to snake_case automatically
    });
    // Clear cases list cache
    clearCache('list_cases');
  },
};

