/**
 * Test setup file for Vitest
 * Configures testing library and global test utilities
 */

import "@testing-library/jest-dom"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock logger globally (used by hooks with require())
vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Extend Vitest's expect with jest-dom matchers
// This is handled by @testing-library/jest-dom import above

