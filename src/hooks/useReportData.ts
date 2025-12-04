import { useState, useEffect } from "react"
import { noteService } from "@/services/noteService"
import { findingService } from "@/services/findingService"
import { timelineService } from "@/services/timelineService"
import type { Note } from "@/types/note"
import type { Finding } from "@/types/finding"
import type { TimelineEvent } from "@/types/timeline"
import type { InventoryItem } from "@/types/inventory"

export interface ReportData {
  notes: Note[]
  findings: Finding[]
  timelineEvents: TimelineEvent[]
  inventorySummary: {
    total: number
    reviewed: number
    flagged: number
    byType: Record<string, number>
    byStatus: Record<string, number>
  }
}

export function useReportData(caseId: string, items: InventoryItem[]) {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load all case data in parallel
        const [notes, findings, timelineEvents] = await Promise.all([
          noteService.listNotes(caseId), // Get all notes (case-level and file-level)
          findingService.listFindings(caseId),
          timelineService.listEvents(caseId),
        ])

        // Calculate inventory summary
        const inventorySummary = {
          total: items.length,
          reviewed: items.filter(
            (item) => item.status === "reviewed" || item.status === "finalized"
          ).length,
          flagged: items.filter((item) => item.status === "flagged").length,
          byType: items.reduce((acc, item) => {
            const docType = getInventoryField(item, "document_type") || "Unknown"
            acc[docType] = (acc[docType] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          byStatus: items.reduce((acc, item) => {
            const status = item.status || "unreviewed"
            acc[status] = (acc[status] || 0) + 1
            return acc
          }, {} as Record<string, number>),
        }

        if (mounted) {
          setData({
            notes,
            findings,
            timelineEvents: timelineEvents.sort((a, b) => a.event_date - b.event_date),
            inventorySummary,
          })
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to load report data"))
          setLoading(false)
        }
      }
    }

    if (caseId) {
      loadData()
    }

    return () => {
      mounted = false
    }
  }, [caseId, items])

  return { data, loading, error }
}

// Helper to get field from inventory_data
function getInventoryField(item: InventoryItem, field: string): string {
  if (!item.inventory_data) return ""
  try {
    const data = JSON.parse(item.inventory_data)
    return data[field] || ""
  } catch {
    return ""
  }
}

