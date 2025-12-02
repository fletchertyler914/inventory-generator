/**
 * ELITE: Tauri Store Utilities
 * Provides a unified interface for persistent storage using tauri-plugin-store
 * Replaces localStorage with secure, cross-platform Tauri storage
 */

import { Store } from '@tauri-apps/plugin-store';

// Store instances - lazy loaded
let appStore: Store | null = null;
let settingsStore: Store | null = null;

/**
 * Get or create the main app store instance
 */
async function getAppStore(): Promise<Store> {
  if (!appStore) {
    const { Store } = await import('@tauri-apps/plugin-store');
    appStore = await Store.load('.app-store.json');
  }
  return appStore;
}

/**
 * Get or create the settings store instance
 */
async function getSettingsStore(): Promise<Store> {
  if (!settingsStore) {
    const { Store } = await import('@tauri-apps/plugin-store');
    settingsStore = await Store.load('.settings-store.json');
  }
  return settingsStore;
}

/**
 * Check if we're running in Tauri (vs browser)
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Get a value from the store
 */
export async function getStoreValue<T>(key: string, defaultValue: T, storeName: 'app' | 'settings' = 'app'): Promise<T> {
  if (!isTauri()) {
    // Fallback to localStorage in browser mode
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored) as T;
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  try {
    const store = storeName === 'settings' ? await getSettingsStore() : await getAppStore();
    const value = await store.get<T>(key);
    return value ?? defaultValue;
  } catch (error) {
    console.error(`Failed to get store value for key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Set a value in the store
 */
export async function setStoreValue<T>(key: string, value: T, storeName: 'app' | 'settings' = 'app'): Promise<void> {
  if (!isTauri()) {
    // Fallback to localStorage in browser mode
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set localStorage value for key "${key}":`, error);
    }
    return;
  }

  try {
    const store = storeName === 'settings' ? await getSettingsStore() : await getAppStore();
    await store.set(key, value);
    await store.save();
  } catch (error) {
    console.error(`Failed to set store value for key "${key}":`, error);
    throw error;
  }
}

/**
 * Remove a value from the store
 */
export async function removeStoreValue(key: string, storeName: 'app' | 'settings' = 'app'): Promise<void> {
  if (!isTauri()) {
    // Fallback to localStorage in browser mode
    localStorage.removeItem(key);
    return;
  }

  try {
    const store = storeName === 'settings' ? await getSettingsStore() : await getAppStore();
    await store.delete(key);
    await store.save();
  } catch (error) {
    console.error(`Failed to remove store value for key "${key}":`, error);
  }
}

/**
 * Get all keys from the store
 */
export async function getStoreKeys(storeName: 'app' | 'settings' = 'app'): Promise<string[]> {
  if (!isTauri()) {
    // Fallback to localStorage in browser mode
    return Object.keys(localStorage);
  }

  try {
    const store = storeName === 'settings' ? await getSettingsStore() : await getAppStore();
    return await store.keys();
  } catch (error) {
    console.error('Failed to get store keys:', error);
    return [];
  }
}

/**
 * Clear all values from the store
 */
export async function clearStore(storeName: 'app' | 'settings' = 'app'): Promise<void> {
  if (!isTauri()) {
    // Fallback to localStorage in browser mode
    localStorage.clear();
    return;
  }

  try {
    const store = storeName === 'settings' ? await getSettingsStore() : await getAppStore();
    await store.clear();
    await store.save();
  } catch (error) {
    console.error('Failed to clear store:', error);
  }
}

