import { useState, useEffect } from "react"
import type { InventoryItem } from "@/types/inventory"

export interface RecentInventory {
  id: string
  name: string
  filePath: string
  itemCount: number
  caseNumber: string | null
  lastOpened: number // timestamp
  folderPath?: string | null
}

const STORAGE_KEY = "recent_inventories"
const MAX_RECENT = 10

export function useRecentInventories() {
  const [recentInventories, setRecentInventories] = useState<RecentInventory[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RecentInventory[]
        setRecentInventories(parsed)
      }
    } catch (error) {
      console.error("Error loading recent inventories:", error)
    }
  }, [])

  // Save to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentInventories))
    } catch (error) {
      console.error("Error saving recent inventories:", error)
    }
  }, [recentInventories])

  const addRecentInventory = (
    filePath: string,
    items: InventoryItem[],
    caseNumber: string | null,
    folderPath?: string | null
  ) => {
    const fileName = filePath.split(/[/\\]/).pop() || "inventory"
    const id = `${filePath}-${Date.now()}`
    
    const newRecent: RecentInventory = {
      id,
      name: fileName,
      filePath,
      itemCount: items.length,
      caseNumber,
      lastOpened: Date.now(),
      folderPath: folderPath || null,
    }

    setRecentInventories((prev) => {
      // Remove if already exists (same file path)
      const filtered = prev.filter((inv) => inv.filePath !== filePath)
      // Add new one at the beginning
      const updated = [newRecent, ...filtered]
      // Keep only the most recent MAX_RECENT
      return updated.slice(0, MAX_RECENT)
    })
  }

  const removeRecentInventory = (id: string) => {
    setRecentInventories((prev) => prev.filter((inv) => inv.id !== id))
  }

  const clearRecentInventories = () => {
    setRecentInventories([])
  }

  const updateLastOpened = (filePath: string) => {
    setRecentInventories((prev) =>
      prev.map((inv) =>
        inv.filePath === filePath
          ? { ...inv, lastOpened: Date.now() }
          : inv
      )
    )
  }

  return {
    recentInventories,
    addRecentInventory,
    removeRecentInventory,
    clearRecentInventories,
    updateLastOpened,
  }
}

