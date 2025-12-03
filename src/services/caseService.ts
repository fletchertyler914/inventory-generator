import { safeInvoke } from '@/lib/tauri-utils';
import type { Case } from '../types/case';

export const caseService = {
  async createCase(
    name: string,
    sources: string[],
    caseId?: string,
    department?: string,
    client?: string
  ): Promise<Case> {
    return safeInvoke<Case>('create_case', {
      name,
      caseId, // Tauri converts camelCase to snake_case automatically
      department,
      client,
      sources, // Array of file/folder paths
    });
  },

  async getOrCreateCase(folderPath: string): Promise<Case> {
    return safeInvoke<Case>('get_or_create_case', {
      folderPath, // Tauri converts camelCase to snake_case automatically
    });
  },

  async listCases(): Promise<Case[]> {
    return safeInvoke<Case[]>('list_cases');
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
    return safeInvoke('delete_case', {
      caseId, // Tauri converts camelCase to snake_case automatically
    });
  },
};

