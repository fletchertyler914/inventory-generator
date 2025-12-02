import { invoke } from '@tauri-apps/api/core';
import type { TimelineEvent } from '@/types/timeline';

export const timelineService = {
  async createEvent(
    caseId: string,
    eventDate: number, // Unix timestamp
    description: string,
    sourceFileId?: string,
    eventType: 'auto' | 'manual' | 'extracted' = 'manual',
    metadata?: Record<string, unknown>
  ): Promise<TimelineEvent> {
    return invoke<TimelineEvent>('create_timeline_event', {
      caseId,
      eventDate,
      description,
      sourceFileId,
      eventType,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  },

  async updateEvent(
    eventId: string,
    eventDate?: number,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return invoke('update_timeline_event', {
      eventId,
      eventDate,
      description,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  },

  async deleteEvent(eventId: string): Promise<void> {
    return invoke('delete_timeline_event', {
      eventId,
    });
  },

  async listEvents(caseId: string): Promise<TimelineEvent[]> {
    return invoke<TimelineEvent[]>('list_timeline_events', {
      caseId,
    });
  },
};
