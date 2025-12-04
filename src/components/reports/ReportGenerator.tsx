/**
 * ReportGenerator - Basic Report Generation
 *
 * TODO: Comprehensive Report Generation Feature
 *
 * Future enhancements needed:
 * - Pull in all case data: notes, findings, timeline events, inventory items
 * - Present in clean, intuitive interface for writing official reports
 * - Support for AI-assisted drafting (prepare architecture for this)
 * - Multiple export formats: PDF, DOCX, XLSX
 * - Rich report templates with customizable sections
 * - Ability to include/exclude specific data types
 * - Report preview before generation
 * - Save report templates for reuse
 */

import { useState } from "react"
import { FileText, Download, FileSpreadsheet } from "lucide-react"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Label } from "../ui/label"
import { Textarea } from "../ui/textarea"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { exportInventory } from "@/services/inventoryService"
import { toast } from "@/hooks/useToast"
import { getColumnConfigAsync } from "@/types/tableColumns"
import type { InventoryItem } from "@/types/inventory"
import type { Case } from "@/types/case"

interface ReportGeneratorProps {
  items: InventoryItem[]
  case_: Case
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportGenerator({ items, case_, open, onOpenChange }: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<"summary" | "detailed" | "timeline">("summary")
  const [title, setTitle] = useState(`Case Report: ${case_.name}`)
  const [executiveSummary, setExecutiveSummary] = useState("")
  const [format, setFormat] = useState<"xlsx" | "pdf" | "docx">("xlsx")
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!items.length) {
      toast({
        title: "No items to export",
        description: "Please add items to the inventory first.",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    try {
      // For now, use the existing export functionality
      // In the future, we can enhance this with Word/PDF generation
      if (format === "xlsx") {
        const { save } = await import("@tauri-apps/plugin-dialog")
        const filePath = await save({
          defaultPath: `${case_.name}_report.xlsx`,
          filters: [
            {
              name: "Excel",
              extensions: ["xlsx"],
            },
          ],
        })

        if (filePath) {
          // Retrieve column configuration for the case
          const columnConfig = await getColumnConfigAsync(case_.case_id || undefined)

          // Convert TableColumnConfig to export format
          const exportColumnConfig = {
            columns: columnConfig.columns.map((col) => ({
              id: col.id,
              label: col.label,
              visible: col.visible,
              order: col.order,
              ...(col.fieldPath && { fieldPath: col.fieldPath }),
            })),
          }

          await exportInventory(
            items,
            "xlsx",
            filePath,
            case_.case_id || null,
            null,
            exportColumnConfig
          )
          toast({
            title: "Report generated",
            description: "Your report has been exported successfully.",
            variant: "success",
          })
          onOpenChange(false)
        }
      } else {
        toast({
          title: "Coming soon",
          description: `${format.toUpperCase()} export will be available soon.`,
        })
      }
    } catch (error) {
      console.error("Report generation error:", error)
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  // Helper to get field from inventory_data
  const getInventoryField = (item: InventoryItem, field: string): string => {
    if (!item.inventory_data) return ""
    try {
      const data = JSON.parse(item.inventory_data)
      return data[field] || ""
    } catch {
      return ""
    }
  }

  // Calculate report statistics
  const stats = {
    total: items.length,
    reviewed: items.filter((item) => item.status === "reviewed" || item.status === "finalized")
      .length,
    flagged: items.filter((item) => item.status === "flagged").length,
    byType: items.reduce(
      (acc, item) => {
        const docType = getInventoryField(item, "document_type") || "Unknown"
        acc[docType] = (acc[docType] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>Create a comprehensive report for {case_.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Type */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select
              value={reportType}
              onValueChange={(value: "summary" | "detailed" | "timeline") => setReportType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Executive Summary</SelectItem>
                <SelectItem value="detailed">Detailed Inventory</SelectItem>
                <SelectItem value="timeline">Timeline Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Report Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Report title"
            />
          </div>

          {/* Executive Summary */}
          {reportType === "summary" && (
            <div className="space-y-2">
              <Label>Executive Summary</Label>
              <Textarea
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                placeholder="Enter executive summary..."
                className="min-h-[120px]"
              />
            </div>
          )}

          {/* Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select
              value={format}
              onValueChange={(value: "xlsx" | "pdf" | "docx") => setFormat(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="pdf" disabled>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF (.pdf) - Coming soon
                  </div>
                </SelectItem>
                <SelectItem value="docx" disabled>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Word (.docx) - Coming soon
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview Stats */}
          <div className="p-4 border rounded-lg bg-muted/30 border-border/40 dark:border-border/50">
            <div className="text-sm font-semibold mb-3">Report Preview</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Documents</div>
                <div className="text-lg font-semibold">{stats.total}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Reviewed</div>
                <div className="text-lg font-semibold text-success">{stats.reviewed}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Flagged</div>
                <div className="text-lg font-semibold text-warning">{stats.flagged}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Document Types</div>
                <div className="text-lg font-semibold">{Object.keys(stats.byType).length}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Download className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
