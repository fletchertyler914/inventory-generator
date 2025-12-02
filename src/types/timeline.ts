/**
 * Type definitions for timeline events
 */

export interface TimelineEvent {
  id: string;
  case_id: string;
  event_date: number; // Unix timestamp
  description: string;
  source_file_id?: string; // Optional file reference
  event_type: 'auto' | 'manual' | 'extracted';
  metadata?: string; // JSON string for additional data
  created_at: number;
}
