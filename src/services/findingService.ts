import { invoke } from '@tauri-apps/api/core';
import type { Finding, FindingUpdate } from '@/types/finding';

export const findingService = {
  async createFinding(
    caseId: string,
    title: string,
    description: string,
    severity: Finding['severity'] = 'medium',
    linkedFiles?: string[],
    tags?: string[]
  ): Promise<Finding> {
    return invoke<Finding>('create_finding', {
      caseId, // Tauri converts camelCase to snake_case automatically
      title,
      description,
      severity,
      linkedFiles, // Tauri converts camelCase to snake_case automatically
      tags,
    });
  },

  async updateFinding(
    findingId: string,
    updates: FindingUpdate
  ): Promise<void> {
    return invoke('update_finding', {
      findingId, // Tauri converts camelCase to snake_case automatically
      ...updates,
    });
  },

  async deleteFinding(findingId: string): Promise<void> {
    return invoke('delete_finding', {
      findingId, // Tauri converts camelCase to snake_case automatically
    });
  },

  async listFindings(caseId: string): Promise<Finding[]> {
    const findings = await invoke<Array<{
      id: string;
      case_id: string;
      title: string;
      description: string;
      severity: string;
      linked_files: string | null;
      tags: string | null;
      created_at: number;
      updated_at: number;
    }>>('list_findings', {
      caseId, // Tauri converts camelCase to snake_case automatically
    });
    
    // Parse JSON strings to arrays
    return findings.map(f => ({
      id: f.id,
      case_id: f.case_id,
      title: f.title,
      description: f.description,
      severity: f.severity as Finding['severity'],
      linked_files: f.linked_files ? JSON.parse(f.linked_files) : [],
      tags: f.tags ? JSON.parse(f.tags) : [],
      created_at: f.created_at,
      updated_at: f.updated_at,
    }));
  },
};

