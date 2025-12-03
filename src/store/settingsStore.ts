/**
 * Settings store
 * Manages application settings
 * Uses Tauri store for persistence (via store-utils)
 */

import { create } from "zustand"

interface SettingsState {
  // Placeholder for future settings
}

export const useSettingsStore = create<SettingsState>(() => ({}))

