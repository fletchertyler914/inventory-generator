/**
 * Request Cache Utility
 * 
 * ELITE: High-performance request caching and deduplication
 * 
 * Features:
 * - TTL-based caching for Tauri command results
 * - Automatic deduplication of concurrent identical requests
 * - Memory-efficient WeakMap-based caching
 * - Type-safe cache keys
 * 
 * CACHING STRATEGY:
 * 
 * ✅ SAFE TO CACHE:
 * - Database queries (files, cases, notes, etc.) - Database is source of truth
 * - Metadata queries (file counts, source lists) - Changes infrequently
 * - Configuration data - Rarely changes
 * 
 * ❌ DO NOT CACHE:
 * - Direct filesystem reads (readFileBase64, readFileText) - Always need latest
 * - File change checks (checkFileChanged) - Must be real-time
 * - Write operations (create, update, delete) - Never cache
 * - Operations that depend on external state (cloud sync status, etc.)
 * 
 * CACHE INVALIDATION:
 * - Cache is automatically cleared after write operations (ingest, sync, delete)
 * - Use clearCache() to manually invalidate when needed
 * - Short TTL (30 seconds) for frequently changing data
 * - Longer TTL (5 minutes) for stable data (source lists, configs)
 * 
 * STALENESS HANDLING:
 * - Database queries represent ingested/synced state, not live filesystem
 * - Users must explicitly sync to refresh from filesystem/cloud
 * - Manual sync button available in UI for on-demand refresh
 * - Cache TTL ensures data refreshes automatically after short period
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// Cache storage: command name + args hash -> cached result
const cache = new Map<string, CacheEntry<unknown>>();

// Pending requests: command name + args hash -> pending promise
const pendingRequests = new Map<string, PendingRequest<unknown>>();

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Generate a cache key from command name and arguments
 */
function generateCacheKey(command: string, args: unknown): string {
  try {
    const argsHash = JSON.stringify(args);
    return `${command}:${argsHash}`;
  } catch {
    // Fallback if JSON.stringify fails
    return `${command}:${String(args)}`;
  }
}

/**
 * Check if a cache entry is still valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  const now = Date.now();
  return now - entry.timestamp < entry.ttl;
}

/**
 * Clear expired cache entries
 */
function clearExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp >= entry.ttl) {
      cache.delete(key);
    }
  }
  
  // Also clear old pending requests (older than 30 seconds)
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > 30000) {
      pendingRequests.delete(key);
    }
  }
}

// Clean up expired entries every minute
if (typeof window !== 'undefined') {
  setInterval(clearExpiredEntries, 60000);
}

/**
 * Cached invoke wrapper for Tauri commands
 * 
 * @param command - Tauri command name
 * @param args - Command arguments
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns Cached or fresh result
 */
export async function cachedInvoke<T>(
  command: string,
  args: unknown = {},
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cacheKey = generateCacheKey(command, args);
  
  // Check cache first
  const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;
  if (isCacheValid(cached)) {
    return cached.data;
  }
  
  // Check for pending request (deduplication)
  const pending = pendingRequests.get(cacheKey) as PendingRequest<T> | undefined;
  if (pending) {
    return pending.promise;
  }
  
  // Create new request
  const { invoke } = await import('@tauri-apps/api/core');
  const promise = invoke<T>(command, args as Record<string, unknown> | undefined);
  
  // Store pending request
  pendingRequests.set(cacheKey, {
    promise,
    timestamp: Date.now(),
  });
  
  try {
    const result = await promise;
    
    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl,
    });
    
    // Remove from pending
    pendingRequests.delete(cacheKey);
    
    return result;
  } catch (error) {
    // Remove from pending on error
    pendingRequests.delete(cacheKey);
    throw error;
  }
}

/**
 * Clear cache for a specific command (or all if command is not provided)
 * 
 * Use this to invalidate cache when:
 * - Files are synced/ingested
 * - Files are added/removed
 * - Data is modified externally
 * - User explicitly requests refresh
 */
export function clearCache(command?: string): void {
  if (command) {
    // Clear all entries for this command
    for (const key of cache.keys()) {
      if (key.startsWith(`${command}:`)) {
        cache.delete(key);
      }
    }
  } else {
    // Clear all cache
    cache.clear();
  }
  
  // Also clear pending requests
  if (command) {
    for (const key of pendingRequests.keys()) {
      if (key.startsWith(`${command}:`)) {
        pendingRequests.delete(key);
      }
    }
  } else {
    pendingRequests.clear();
  }
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  cacheSize: number;
  pendingSize: number;
  cacheKeys: string[];
} {
  return {
    cacheSize: cache.size,
    pendingSize: pendingRequests.size,
    cacheKeys: Array.from(cache.keys()),
  };
}

