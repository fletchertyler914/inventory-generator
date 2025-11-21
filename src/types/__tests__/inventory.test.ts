/**
 * Unit tests for inventory types and utilities
 */

import { describe, it, expect } from "vitest"
import {
  isInventoryItemField,
  updateInventoryItemField,
  type InventoryItem,
} from "../inventory"

describe("inventory types", () => {
  const mockItem: InventoryItem = {
    date_rcvd: "01/01/2024",
    doc_year: 2024,
    doc_date_range: "2024",
    document_type: "PDF",
    document_description: "Test document",
    file_name: "test.pdf",
    folder_name: "test",
    folder_path: "test",
    file_type: "PDF",
    bates_stamp: "B001",
    notes: "Test notes",
    absolute_path: "/test/test.pdf",
  }

  describe("isInventoryItemField", () => {
    it("should return true for valid field names", () => {
      expect(isInventoryItemField("date_rcvd")).toBe(true)
      expect(isInventoryItemField("doc_year")).toBe(true)
      expect(isInventoryItemField("file_name")).toBe(true)
    })

    it("should return false for invalid field names", () => {
      expect(isInventoryItemField("invalid_field")).toBe(false)
      expect(isInventoryItemField("")).toBe(false)
      expect(isInventoryItemField("dateRcvd")).toBe(false)
    })
  })

  describe("updateInventoryItemField", () => {
    it("should update string fields correctly", () => {
      const updated = updateInventoryItemField(mockItem, "date_rcvd", "02/02/2024")
      expect(updated.date_rcvd).toBe("02/02/2024")
      expect(updated.doc_year).toBe(mockItem.doc_year) // Other fields unchanged
    })

    it("should update doc_year field correctly", () => {
      const updated = updateInventoryItemField(mockItem, "doc_year", 2025)
      expect(updated.doc_year).toBe(2025)
    })

    it("should handle string input for doc_year", () => {
      const updated = updateInventoryItemField(mockItem, "doc_year", "2025")
      expect(updated.doc_year).toBe(2025)
    })

    it("should preserve original value for invalid doc_year string", () => {
      const updated = updateInventoryItemField(mockItem, "doc_year", "invalid")
      expect(updated.doc_year).toBe(mockItem.doc_year)
    })
  })
})

