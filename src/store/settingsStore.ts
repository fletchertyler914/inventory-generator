/**
 * Settings store
 * Manages application settings
 * Uses Tauri store for persistence (via store-utils)
 */

import { create } from "zustand"
import type { SystemFileFilterConfig } from "@/services/settingsService"
import { getSystemFileFilterConfig, saveSystemFileFilterConfig } from "@/services/settingsService"

interface SettingsState {
  systemFileFilter: SystemFileFilterConfig | null
  isLoading: boolean
  loadSystemFileFilter: () => Promise<void>
  saveSystemFileFilter: (config: SystemFileFilterConfig) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  systemFileFilter: null,
  isLoading: false,
  
  loadSystemFileFilter: async () => {
    set({ isLoading: true })
    try {
      const config = await getSystemFileFilterConfig()
      set({ systemFileFilter: config, isLoading: false })
    } catch (error) {
      console.error("Failed to load system file filter config:", error)
      // Set default config on error
      set({ 
        systemFileFilter: { 
          enabled: true, 
          patterns: ["DS_Store", "Thumbs.db", "desktop.ini", ".directory"] 
        }, 
        isLoading: false 
      })
    }
  },
  
  saveSystemFileFilter: async (config: SystemFileFilterConfig) => {
    try {
      await saveSystemFileFilterConfig(config)
      set({ systemFileFilter: config })
    } catch (error) {
      console.error("Failed to save system file filter config:", error)
      throw error
    }
  },
}))

