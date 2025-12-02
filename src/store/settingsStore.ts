/**
 * Settings store with localStorage persistence
 * Manages application settings
 */

import { create } from "zustand"

interface SettingsState {
  // Placeholder for future settings
}

export const useSettingsStore = create<SettingsState>(() => ({}))

