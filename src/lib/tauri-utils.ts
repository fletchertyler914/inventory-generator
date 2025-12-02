/**
 * Tauri utility functions
 * Provides safe wrappers for Tauri API calls
 * 
 * NATIVE DESKTOP ONLY - No browser fallback
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Check if running in Tauri context
 * @returns true if Tauri APIs are available
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for Tauri internals (most reliable)
  if ('__TAURI_INTERNALS__' in window) return true;
  
  // Check for Tauri metadata
  if ('__TAURI_METADATA__' in window) return true;
  
  // Check for Tauri IPC channel
  if ('__TAURI_IPC__' in window) return true;
  
  // Check if window is in a Tauri webview (userAgent check)
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('tauri')) return true;
  
  return false;
}

/**
 * Invoke a Tauri command
 * Native desktop app only - requires Tauri context
 * 
 * @param cmd - Command name
 * @param args - Command arguments
 * @returns Promise resolving to the command result
 * @throws Error if not in Tauri context or command fails
 */
export async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Ensure we're in Tauri context
  if (!isTauri()) {
    throw new Error(
      `Tauri command '${cmd}' called outside Tauri context.\n\n` +
      `This is a native desktop application and must be run with 'pnpm tauri dev' or as a built Tauri app.\n` +
      `Running 'pnpm dev' alone will not work because Tauri APIs are not available in a regular browser.`
    );
  }

  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    throw new Error(
      `Tauri command '${cmd}' failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
