/**
 * Type definitions for findings system
 */

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Finding {
  id: string;
  case_id: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  linked_files: string[]; // file IDs (absolute_path)
  tags: string[];
  created_at: number;
  updated_at: number;
}

/**
 * Utility type for partial updates to findings
 */
export type FindingUpdate = Partial<Pick<Finding, 'title' | 'description' | 'severity' | 'linked_files' | 'tags'>>;

