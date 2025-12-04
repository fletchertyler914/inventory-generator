import { invoke } from '@tauri-apps/api/core';

export interface WorkspacePreferences {
  view_mode: 'split' | 'table';
  report_mode: boolean;
  notes_visible: boolean;
  findings_visible: boolean;
  timeline_visible: boolean;
  navigator_open: boolean;
}

export const workspacePreferencesService = {
  /**
   * Get workspace preferences for a case
   */
  async getPreferences(caseId: string): Promise<WorkspacePreferences | null> {
    return invoke<WorkspacePreferences | null>('get_workspace_preferences_db', {
      caseId,
    });
  },

  /**
   * Save workspace preferences for a case
   */
  async savePreferences(
    caseId: string,
    preferences: WorkspacePreferences
  ): Promise<void> {
    return invoke('save_workspace_preferences_db', {
      caseId,
      prefs: preferences,
    });
  },

  /**
   * Get default workspace preferences
   */
  getDefaultPreferences(): WorkspacePreferences {
    return {
      view_mode: 'table',
      report_mode: false,
      notes_visible: false,
      findings_visible: false,
      timeline_visible: false,
      navigator_open: true,
    };
  },
};

