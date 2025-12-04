/**
 * Base Service Utilities
 * 
 * Provides common patterns for service methods:
 * - Standardized error handling
 * - Request retry logic
 * - Caching utilities
 * - Type-safe invoke wrapper
 */

import { safeInvoke } from '@/lib/tauri-utils';
import { cachedInvoke, clearCache } from '@/lib/request-cache';
import { createAppErrorWithRecovery, reportError, withRetry, ErrorCode } from '@/lib/error-handler';

/**
 * Service method options
 */
export interface ServiceMethodOptions {
  /** Enable caching for this method */
  cache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** Enable retry for transient errors */
  retry?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Error code for error handling */
  errorCode?: ErrorCode;
}

/**
 * Type-safe invoke wrapper with error handling
 */
export async function serviceInvoke<T>(
  command: string,
  args: unknown = {},
  options: ServiceMethodOptions = {}
): Promise<T> {
  const {
    cache = false,
    cacheTtl = 5 * 60 * 1000,
    retry = false,
    maxRetries = 3,
    errorCode = ErrorCode.UNKNOWN_ERROR,
  } = options;

  try {
    const invokeFn = async () => {
      if (cache) {
        return cachedInvoke<T>(command, args as Record<string, unknown> | undefined, cacheTtl);
      }
      return safeInvoke<T>(command, args as Record<string, unknown> | undefined);
    };

    if (retry) {
      return await withRetry(invokeFn, maxRetries);
    }

    return await invokeFn();
  } catch (error) {
    const appError = createAppErrorWithRecovery(error, errorCode);
    reportError(appError, `Service:${command}`);
    throw appError;
  }
}

/**
 * Clear cache for a service command
 */
export function clearServiceCache(command: string): void {
  clearCache(command);
}

/**
 * Base service class pattern (optional, for future use)
 */
export abstract class BaseService {
  protected async invoke<T>(
    command: string,
    args: unknown = {},
    options: ServiceMethodOptions = {}
  ): Promise<T> {
    return serviceInvoke<T>(command, args, options);
  }

  protected clearCache(command: string): void {
    clearServiceCache(command);
  }
}

