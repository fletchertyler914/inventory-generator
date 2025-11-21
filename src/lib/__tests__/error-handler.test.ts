/**
 * Unit tests for error handling utilities
 */

import { describe, it, expect } from "vitest"
import { createAppError, ErrorCode } from "../error-handler"

describe("error-handler", () => {
  describe("createAppError", () => {
    it("should handle Error objects", () => {
      const error = new Error("Test error")
      const appError = createAppError(error)

      expect(appError.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(appError.message).toBe("Test error")
      expect(appError.originalError).toBe(error)
    })

    it("should detect path not found errors", () => {
      const error = new Error("Path does not exist")
      const appError = createAppError(error)

      expect(appError.code).toBe(ErrorCode.FILE_NOT_FOUND)
      expect(appError.message).toContain("could not be found")
    })

    it("should detect permission errors", () => {
      const error = new Error("Permission denied")
      const appError = createAppError(error)

      expect(appError.code).toBe(ErrorCode.PERMISSION_DENIED)
      expect(appError.message).toContain("Permission denied")
    })

    it("should handle string errors", () => {
      const appError = createAppError("String error", ErrorCode.SCAN_DIRECTORY_FAILED)

      expect(appError.code).toBe(ErrorCode.SCAN_DIRECTORY_FAILED)
      expect(appError.message).toBe("String error")
    })

    it("should handle unknown error types", () => {
      const appError = createAppError({ some: "object" })

      expect(appError.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(appError.message).toBe("An unexpected error occurred. Please try again.")
    })
  })
})

