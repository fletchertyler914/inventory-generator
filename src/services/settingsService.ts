/**
 * Service layer for settings-related Tauri command invocations
 */

import { invoke } from "@tauri-apps/api/core"

export interface SystemFileFilterConfig {
  enabled: boolean
  patterns: string[]
}

/**
 * Get system file filter configuration
 */
export async function getSystemFileFilterConfig(): Promise<SystemFileFilterConfig> {
  const configJson = await invoke<string>("get_system_file_filter_config")
  return JSON.parse(configJson)
}

/**
 * Save system file filter configuration
 */
export async function saveSystemFileFilterConfig(config: SystemFileFilterConfig): Promise<void> {
  const configJson = JSON.stringify(config)
  await invoke("save_system_file_filter_config", { config: configJson })
}

