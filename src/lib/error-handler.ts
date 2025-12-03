/**
 * Centralized error handling utilities
 * Provides user-friendly error messages and error codes
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
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AppError {
  code: ErrorCode
  message: string
  originalError?: unknown
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

