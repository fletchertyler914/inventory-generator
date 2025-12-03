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
    absolute_path: "/test/test.pdf",
    file_name: "test.pdf",
    folder_name: "test",
    folder_path: "test",
    file_type: "PDF",
    inventory_data: JSON.stringify({
      date_rcvd: "01/01/2024",
      doc_year: 2024,
      doc_date_range: "2024",
      document_type: "PDF",
      document_description: "Test document",
      bates_stamp: "B001",
      notes: "Test notes",
    }),
  }

  // Helper to get field from inventory_data
  const getInventoryField = (item: InventoryItem, field: string): string => {
    if (!item.inventory_data) return '';
    try {
      const data = JSON.parse(item.inventory_data);
      return data[field] || '';
    } catch {
      return '';
    }
  };

  describe("isInventoryItemField", () => {
    it("should return true for valid field names", () => {
      expect(isInventoryItemField("file_name")).toBe(true)
      expect(isInventoryItemField("absolute_path")).toBe(true)
      expect(isInventoryItemField("status")).toBe(true)
    })

    it("should return false for invalid field names", () => {
      expect(isInventoryItemField("invalid_field")).toBe(false)
      expect(isInventoryItemField("")).toBe(false)
    })
  })

  describe("updateInventoryItemField", () => {
    it("should update core string fields correctly", () => {
      const updated = updateInventoryItemField(mockItem, "file_name", "updated.pdf")
      expect(updated.file_name).toBe("updated.pdf")
      expect(updated.absolute_path).toBe(mockItem.absolute_path) // Other fields unchanged
    })

    it("should update inventory_data fields correctly", () => {
      const updated = updateInventoryItemField(mockItem, "date_rcvd", "02/02/2024")
      const updatedDate = getInventoryField(updated, "date_rcvd")
      expect(updatedDate).toBe("02/02/2024")
    })

    it("should handle numeric fields in inventory_data", () => {
      const updated = updateInventoryItemField(mockItem, "doc_year", 2025)
      const updatedYear = getInventoryField(updated, "doc_year")
      expect(updatedYear).toBe("2025")
    })

    it("should handle string input for numeric fields", () => {
      const updated = updateInventoryItemField(mockItem, "doc_year", "2025")
      const updatedYear = getInventoryField(updated, "doc_year")
      expect(updatedYear).toBe("2025")
    })
  })
})

