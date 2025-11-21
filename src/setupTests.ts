/**
 * Test setup file for Vitest
 * Configures testing library and global test utilities
 */

import "@testing-library/jest-dom"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Extend Vitest's expect with jest-dom matchers
// This is handled by @testing-library/jest-dom import above

