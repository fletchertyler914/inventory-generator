/**
 * Settings store with localStorage persistence
 * Manages application settings like sync polling configuration
 */

import { create } from "zustand"

interface SettingsState {
  syncPollingEnabled: boolean
  syncPollingInterval: number // in milliseconds
  
  setSyncPollingEnabled: (enabled: boolean) => void
  setSyncPollingInterval: (interval: number) => void
  loadSettings: () => void
}

const STORAGE_KEY = "app_settings"
const defaultSettings = {
  syncPollingEnabled: true,
  syncPollingInterval: 30000, // 30 seconds
}

// Load settings from localStorage
const loadFromStorage = (): Pick<SettingsState, 'syncPollingEnabled' | 'syncPollingInterval'> => {
  if (typeof window === "undefined") {
    return defaultSettings
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        syncPollingEnabled: parsed.syncPollingEnabled ?? defaultSettings.syncPollingEnabled,
        syncPollingInterval: parsed.syncPollingInterval ?? defaultSettings.syncPollingInterval,
      }
    }
  } catch (error) {
    console.error("Error loading settings:", error)
  }
  return defaultSettings
}

// Save settings to localStorage
const saveToStorage = (settings: Partial<SettingsState>) => {
  if (typeof window === "undefined") {
    return
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      syncPollingEnabled: settings.syncPollingEnabled,
      syncPollingInterval: settings.syncPollingInterval,
    }))
  } catch (error) {
    console.error("Error saving settings:", error)
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadFromStorage(),
  
  setSyncPollingEnabled: (enabled) => {
    set({ syncPollingEnabled: enabled })
    saveToStorage({ ...get(), syncPollingEnabled: enabled })
  },
  
  setSyncPollingInterval: (interval) => {
    // Clamp interval between 10 seconds and 5 minutes
    const clamped = Math.max(10000, Math.min(300000, interval))
    set({ syncPollingInterval: clamped })
    saveToStorage({ ...get(), syncPollingInterval: clamped })
  },
  
  loadSettings: () => {
    const loaded = loadFromStorage()
    set(loaded)
  },
}))

