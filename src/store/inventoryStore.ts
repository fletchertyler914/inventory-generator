/**
 * Zustand store for centralized inventory state management
 * 
 * Consolidates inventory items, loading states, and UI state in a single store.
 * This reduces prop drilling and improves performance through selective subscriptions.
 * 
 * @example
 * ```ts
 * // In a component
 * const items = useInventoryStore(state => state.items)
 * const setItems = useInventoryStore(state => state.setItems)
 * 
 * // Or use the useInventory hook which wraps this store
 * const { items, setItems } = useInventory()
 * ```
 */

import { create } from "zustand"
import type { InventoryItem } from "@/types/inventory"

interface InventoryState {
  // Inventory data
  items: InventoryItem[]
  selectedFolder: string | null
  caseNumber: string
  selectedIndices: number[]
  
  // Loading states
  loading: boolean
  scanning: boolean
  exporting: boolean
  importing: boolean
  syncing: boolean
  
  // Sync status
  syncStatus: 'synced' | 'out_of_sync' | null
  folderFileCount: number | null
  
  // UI state
  exportDialogOpen: boolean
  importDialogOpen: boolean
  
  // Actions
  setItems: (items: InventoryItem[]) => void
  updateItem: (index: number, updates: Partial<InventoryItem>) => void
  bulkUpdateItems: (updates: Partial<InventoryItem>, indices?: number[]) => void
  setSelectedFolder: (folder: string | null) => void
  setCaseNumber: (caseNumber: string) => void
  setSelectedIndices: (indices: number[]) => void
  setLoading: (loading: boolean) => void
  setScanning: (scanning: boolean) => void
  setExporting: (exporting: boolean) => void
  setImporting: (importing: boolean) => void
  setSyncing: (syncing: boolean) => void
  setSyncStatus: (status: 'synced' | 'out_of_sync' | null, fileCount?: number) => void
  setExportDialogOpen: (open: boolean) => void
  setImportDialogOpen: (open: boolean) => void
  reset: () => void
}

const initialState = {
  items: [],
  selectedFolder: null,
  caseNumber: "",
  selectedIndices: [],
  loading: false,
  scanning: false,
  exporting: false,
  importing: false,
  syncing: false,
  syncStatus: null as 'synced' | 'out_of_sync' | null,
  folderFileCount: null as number | null,
  exportDialogOpen: false,
  importDialogOpen: false,
}

/**
 * Zustand store for inventory state management
 * 
 * Provides centralized state for:
 * - Inventory items and metadata
 * - Loading states for async operations
 * - UI state (dialog open/closed)
 * - Selection state
 */
export const useInventoryStore = create<InventoryState>((set) => ({
  ...initialState,
  
  setItems: (items) => set({ items }),
  
  updateItem: (index, updates) =>
    set((state) => {
      const updated = [...state.items]
      if (index >= 0 && index < updated.length) {
        updated[index] = { ...updated[index], ...updates } as InventoryItem
      }
      return { items: updated }
    }),
  
  bulkUpdateItems: (updates, indices) =>
    set((state) => {
      if (indices && indices.length > 0) {
        // Update only selected items
        const updated = [...state.items]
        indices.forEach((index) => {
          if (index >= 0 && index < updated.length) {
            updated[index] = { ...updated[index], ...updates } as InventoryItem
          }
        })
        return { items: updated }
      } else {
        // Update all items
        return {
          items: state.items.map((item) => ({ ...item, ...updates } as InventoryItem)),
        }
      }
    }),
  
  
  setCaseNumber: (caseNumber) => set({ caseNumber }),
  
  setSelectedIndices: (indices) => set({ selectedIndices: indices }),
  
  setLoading: (loading) => set({ loading }),
  
  setScanning: (scanning) => set({ scanning, loading: scanning }),
  
  setExporting: (exporting) => set({ exporting }),
  
  setImporting: (importing) => set({ importing }),
  
  setSyncing: (syncing) => set({ syncing, loading: syncing }),
  
  setSyncStatus: (status, fileCount) => set({ 
    syncStatus: status, 
    folderFileCount: fileCount !== undefined ? fileCount : null 
  }),
  
  setSelectedFolder: (folder) => set({ selectedFolder: folder, syncStatus: null }),
  
  setExportDialogOpen: (open) => set({ exportDialogOpen: open }),
  
  setImportDialogOpen: (open) => set({ importDialogOpen: open }),
  
  reset: () => set(initialState),
}))
