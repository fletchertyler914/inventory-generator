/**
 * Unit tests for useInventory hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useInventory } from "../useInventory"
import * as inventoryService from "@/services/inventoryService"
import { useInventoryStore } from "@/store/inventoryStore"

// Mock the service
vi.mock("@/services/inventoryService", () => ({
  scanDirectory: vi.fn(),
  syncInventory: vi.fn(),
}))

// Mock toast
vi.mock("../useToast", () => ({
  toast: vi.fn(),
}))

describe("useInventory", () => {
  beforeEach(() => {
    // Reset store before each test
    useInventoryStore.getState().reset()
    vi.clearAllMocks()
  })

  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useInventory())

    expect(result.current.items).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.selectedFolder).toBeNull()
  })

  it("should scan folder successfully", async () => {
    const mockItems = [
      {
        date_rcvd: "",
        doc_year: 2024,
        doc_date_range: "",
        document_type: "PDF",
        document_description: "Test document",
        file_name: "test.pdf",
        folder_name: "test",
        folder_path: "test",
        file_type: "PDF",
        bates_stamp: "",
        notes: "",
        absolute_path: "/test/test.pdf",
      },
    ]

    vi.mocked(inventoryService.scanDirectory).mockResolvedValue(mockItems)

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      await result.current.scanFolder("/test/path")
    })

    expect(result.current.items).toEqual(mockItems)
    expect(result.current.selectedFolder).toBe("/test/path")
    expect(result.current.loading).toBe(false)
  })

  it("should handle scan folder errors", async () => {
    const error = new Error("Scan failed")
    vi.mocked(inventoryService.scanDirectory).mockRejectedValue(error)

    const { result } = renderHook(() => useInventory())

    await act(async () => {
      try {
        await result.current.scanFolder("/test/path")
      } catch (e) {
        // Expected error
      }
    })

    expect(result.current.items).toEqual([])
    expect(result.current.loading).toBe(false)
  })
})

