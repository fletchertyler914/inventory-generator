/**
 * Centralized error handling utilities
 * Provides user-friendly error messages, error codes, retry logic, and recovery strategies
 */

export enum ErrorCode {
  SCAN_DIRECTORY_FAILED = "SCAN_DIRECTORY_FAILED",
  EXPORT_FAILED = "EXPORT_FAILED",
  IMPORT_FAILED = "IMPORT_FAILED",
  SYNC_FAILED = "SYNC_FAILED",
  INVALID_PATH = "INVALID_PATH",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  CREATE_CASE_FAILED = "CREATE_CASE_FAILED",
  DATABASE_ERROR = "DATABASE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Error recovery strategies
 */
export enum RecoveryStrategy {
  RETRY = "RETRY",
  FALLBACK = "FALLBACK",
  IGNORE = "IGNORE",
  USER_ACTION = "USER_ACTION",
}

export interface AppError {
  code: ErrorCode
  message: string
  originalError?: unknown
  recoverable?: boolean
  recoveryStrategy?: RecoveryStrategy
  retryable?: boolean
  maxRetries?: number
}

/**
 * Creates a user-friendly error message from various error types
 */
export function createAppError(error: unknown, defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR): AppError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Map common error patterns to error codes
    if (message.includes("path does not exist") || message.includes("not found")) {
      return {
        code: ErrorCode.FILE_NOT_FOUND,
        message: "The specified path could not be found. Please check the path and try again.",
        originalError: error,
      }
    }
    
    if (message.includes("permission") || message.includes("denied")) {
      return {
        code: ErrorCode.PERMISSION_DENIED,
        message: "Permission denied. Please check file permissions and try again.",
        originalError: error,
      }
    }
    
    if (message.includes("not a directory") || message.includes("invalid path")) {
      return {
        code: ErrorCode.INVALID_PATH,
        message: "Invalid path. Please select a valid directory.",
        originalError: error,
      }
    }
    
    // Return the error message if it's already user-friendly
    return {
      code: defaultCode,
      message: error.message,
      originalError: error,
    }
  }
  
  if (typeof error === "string") {
    return {
      code: defaultCode,
      message: error,
      originalError: error,
    }
  }
  
  return {
    code: defaultCode,
    message: "An unexpected error occurred. Please try again.",
    originalError: error,
  }
}

/**
 * Logs error to console
 * In production, errors should be sent to a logging service
 */
export function logError(error: AppError, context?: string): void {
  const prefix = context ? `[${context}]` : "[Error]"
  console.error(`${prefix} ${error.code}: ${error.message}`, error.originalError)
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    // Network errors, timeouts, and temporary failures are retryable
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("temporary") ||
      message.includes("connection") ||
      message.includes("eagain") ||
      message.includes("econnreset")
    )
  }
  return false
}

/**
 * Determines recovery strategy for an error
 */
function getRecoveryStrategy(error: unknown): RecoveryStrategy {
  if (isRetryableError(error)) {
    return RecoveryStrategy.RETRY
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes("permission") || message.includes("denied")) {
      return RecoveryStrategy.USER_ACTION
    }
    if (message.includes("not found") || message.includes("invalid")) {
      return RecoveryStrategy.USER_ACTION
    }
  }
  
  return RecoveryStrategy.IGNORE
}

/**
 * Enhanced error creation with recovery information
 */
export function createAppErrorWithRecovery(
  error: unknown,
  defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR
): AppError {
  const baseError = createAppError(error, defaultCode)
  const retryable = isRetryableError(error)
  const recoveryStrategy = getRecoveryStrategy(error)
  
  return {
    ...baseError,
    retryable,
    recoverable: recoveryStrategy !== RecoveryStrategy.IGNORE,
    recoveryStrategy,
    maxRetries: retryable ? 3 : 0,
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

/**
 * Error reporting hook (can be extended for analytics)
 */
export type ErrorReporter = (error: AppError, context?: string) => void

let errorReporter: ErrorReporter | null = null

/**
 * Set custom error reporter
 */
export function setErrorReporter(reporter: ErrorReporter): void {
  errorReporter = reporter
}

/**
 * Report error using configured reporter
 */
export function reportError(error: AppError, context?: string): void {
  logError(error, context)
  if (errorReporter) {
    errorReporter(error, context)
  }
}

