import { useState, useEffect } from "react"
import type { InventoryItem } from "@/types/inventory"
import { getStoreValue, setStoreValue } from "@/lib/store-utils"

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
  const [isLoading, setIsLoading] = useState(true)

  // Load from Tauri store on mount
  useEffect(() => {
    let mounted = true
    getStoreValue<RecentInventory[]>(STORAGE_KEY, [], "app")
      .then((stored) => {
        if (mounted) {
          setRecentInventories(stored)
          setIsLoading(false)
        }
      })
      .catch((error) => {
        console.error("Error loading recent inventories:", error)
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  // Save to Tauri store whenever it changes
  useEffect(() => {
    if (isLoading) return // Don't save during initial load

    setStoreValue(STORAGE_KEY, recentInventories, "app").catch((error) => {
      console.error("Error saving recent inventories:", error)
    })
  }, [recentInventories, isLoading])

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
      prev.map((inv) => (inv.filePath === filePath ? { ...inv, lastOpened: Date.now() } : inv))
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
