/**
 * Environment utilities
 * Provides compile-time environment detection using Vite's build-time replacement
 * Avoids runtime checks where possible
 */

/**
 * Check if running in development mode
 * This is replaced at build time by Vite
 */
export const isDevelopment = import.meta.env.DEV;

/**
 * Check if running in production mode
 * This is replaced at build time by Vite
 */
export const isProduction = import.meta.env.PROD;

/**
 * Check if running in Tauri context
 * Runtime check (needed for Tauri detection)
 */
export function isTauriContext(): boolean {
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
 * Get feature flag value
 * Feature flags should be set via environment variables at build time
 */
export function getFeatureFlag(flag: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[`VITE_${flag}`];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === true;
}

