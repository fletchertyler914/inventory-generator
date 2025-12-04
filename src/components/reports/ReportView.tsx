import { useState } from "react"
import { Button } from "../ui/button"
import { Download, Eye, EyeOff, Loader2 } from "lucide-react"
import { useReportData } from "@/hooks/useReportData"
import { ReportSections } from "./ReportSections"
import type { Case } from "@/types/case"
import type { InventoryItem } from "@/types/inventory"

interface ReportViewProps {
  case_: Case
  items: InventoryItem[]
  onToggleReportMode: () => void
}

export function ReportView({
  case_,
  items,
  onToggleReportMode: _onToggleReportMode,
}: ReportViewProps) {
  const [previewVisible, setPreviewVisible] = useState(false)
  const [currentSection, setCurrentSection] = useState<string>("executive-summary")
  const { data, loading, error } = useReportData(case_.id, items)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Section - Section Navigation */}
        <div className="w-64 border-r border-border/40 dark:border-border/50 bg-card flex-shrink-0 flex flex-col">
          <div className="p-4 border-b border-border/40 dark:border-border/50">
            <h3 className="text-sm font-semibold mb-2">Sections</h3>
            <div className="space-y-1">
              {[
                { id: "executive-summary", label: "Executive Summary" },
                { id: "case-overview", label: "Case Overview" },
                { id: "findings", label: "Findings" },
                { id: "timeline", label: "Timeline" },
                { id: "inventory-summary", label: "Inventory Summary" },
                { id: "notes", label: "Notes" },
                { id: "appendices", label: "Appendices" },
              ].map((section) => (
                <div
                  key={section.id}
                  onClick={() => {
                    setCurrentSection(section.id)
                    // Scroll to section
                    const element = document.getElementById(section.id)
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  }}
                  className={`
                    text-xs p-2 rounded cursor-pointer transition-colors
                    ${
                      currentSection === section.id
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted"
                    }
                  `}
                >
                  {section.label}
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-border/40 dark:border-border/50">
            <h3 className="text-sm font-semibold mb-2">Templates</h3>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground p-2 rounded hover:bg-muted cursor-pointer">
                Blank Report
              </div>
              <div className="text-xs text-muted-foreground p-2 rounded hover:bg-muted cursor-pointer">
                Legal Case Report
              </div>
              <div className="text-xs text-muted-foreground p-2 rounded hover:bg-muted cursor-pointer">
                Investigation Report
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top Bar - Only in content area */}
          <div className="h-12 border-b border-border/40 dark:border-border/50 bg-card flex-shrink-0 flex items-center justify-end px-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewVisible(!previewVisible)}
                title={previewVisible ? "Hide Preview" : "Show Preview"}
                className="h-8 w-8"
              >
                {previewVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled
                title="Export PDF"
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading report data...</span>
                </div>
              ) : error ? (
                <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
                  <p className="text-sm text-destructive">
                    Failed to load report data: {error.message}
                  </p>
                </div>
              ) : data ? (
                <ReportSections
                  case_={case_}
                  items={items}
                  notes={data.notes}
                  findings={data.findings}
                  timelineEvents={data.timelineEvents}
                  inventorySummary={data.inventorySummary}
                  currentSection={currentSection}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Section - Preview (optional) */}
        {previewVisible && (
          <div className="w-96 border-l border-border/40 dark:border-border/50 bg-card flex-shrink-0 flex flex-col">
            <div className="p-4 border-b border-border/40 dark:border-border/50">
              <h3 className="text-sm font-semibold">Preview</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground text-sm">
                  Preview will show the rendered report as it will appear in the PDF export.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
