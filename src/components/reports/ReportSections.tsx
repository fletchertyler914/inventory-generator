import { ReportSection } from "./ReportSection"
import type { Case } from "@/types/case"
import type { Note } from "@/types/note"
import type { Finding } from "@/types/finding"
import type { TimelineEvent } from "@/types/timeline"
import type { InventoryItem } from "@/types/inventory"
import { Badge } from "../ui/badge"
import { format } from "date-fns"

interface ReportSectionsProps {
  case_: Case
  items: InventoryItem[]
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
  currentSection?: string
}

export function ReportSections({
  case_,
  items,
  notes,
  findings,
  timelineEvents,
  inventorySummary,
  currentSection = "executive-summary",
}: ReportSectionsProps) {
  // Get case-level notes only
  const caseNotes = notes.filter((note) => !note.file_id)

  // Show all sections (users can scroll through the full report)
  return (
    <>
      {/* Report Header - Only above Executive Summary */}
      <div className="mb-8 pb-6 border-b border-border/40 dark:border-border/50">
        <h1 className="text-3xl font-bold mb-2">Case Report: {case_.name}</h1>
        {case_.case_id && (
          <p className="text-muted-foreground">Case ID: {case_.case_id}</p>
        )}
      </div>

      {/* Executive Summary */}
      <div id="executive-summary">
        <ReportSection title="Executive Summary" editable content="" onContentChange={() => {}}>
          <p className="text-muted-foreground">Enter executive summary here...</p>
        </ReportSection>
      </div>

      {/* Case Overview */}
      <div id="case-overview">
        <ReportSection title="Case Overview">
        <div className="space-y-3">
          <div>
            <strong>Case Name:</strong> {case_.name}
          </div>
          {case_.case_id && (
            <div>
              <strong>Case ID:</strong> {case_.case_id}
            </div>
          )}
          {case_.department && (
            <div>
              <strong>Department:</strong> {case_.department}
            </div>
          )}
          {case_.client && (
            <div>
              <strong>Client:</strong> {case_.client}
            </div>
          )}
          <div>
            <strong>Total Documents:</strong> {inventorySummary.total}
          </div>
        </div>
      </ReportSection>
      </div>

      {/* Findings */}
      <div id="findings">
        <ReportSection title="Findings">
        {findings.length > 0 ? (
          <div className="space-y-4">
            {findings.map((finding) => (
              <div key={finding.id} className="p-4 border border-border/40 dark:border-border/50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{finding.title}</h3>
                  <Badge
                    variant={
                      finding.severity === "critical"
                        ? "destructive"
                        : finding.severity === "high"
                          ? "destructive"
                          : finding.severity === "medium"
                            ? "default"
                            : "secondary"
                    }
                  >
                    {finding.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {finding.description}
                </p>
                {finding.linked_files && finding.linked_files.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Linked to {finding.linked_files.length} file(s)
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No findings recorded.</p>
        )}
      </ReportSection>
      </div>

      {/* Timeline */}
      <div id="timeline">
        <ReportSection title="Timeline">
        {timelineEvents.length > 0 ? (
          <div className="space-y-3">
            {timelineEvents.map((event) => (
              <div key={event.id} className="flex gap-4 pb-3 border-b border-border/40 dark:border-border/50 last:border-0">
                <div className="flex-shrink-0 w-32 text-sm text-muted-foreground">
                  {format(new Date(event.event_date * 1000), "MMM d, yyyy")}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{event.description}</p>
                  {event.event_type && (
                    <span className="text-xs text-muted-foreground">
                      ({event.event_type})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No timeline events recorded.</p>
        )}
      </ReportSection>
      </div>

      {/* Inventory Summary */}
      <div id="inventory-summary">
        <ReportSection title="Inventory Summary">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-border/40 dark:border-border/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Documents</div>
              <div className="text-2xl font-semibold">{inventorySummary.total}</div>
            </div>
            <div className="p-4 border border-border/40 dark:border-border/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Reviewed</div>
              <div className="text-2xl font-semibold text-green-600">
                {inventorySummary.reviewed}
              </div>
            </div>
            <div className="p-4 border border-border/40 dark:border-border/50 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Flagged</div>
              <div className="text-2xl font-semibold text-yellow-600">
                {inventorySummary.flagged}
              </div>
            </div>
          </div>

          {Object.keys(inventorySummary.byType).length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Document Types</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(inventorySummary.byType).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span>{type}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(inventorySummary.byStatus).length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Status Breakdown</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(inventorySummary.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span className="capitalize">{status}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ReportSection>
      </div>

      {/* Notes */}
      <div id="notes">
        <ReportSection title="Notes">
        {caseNotes.length > 0 ? (
          <div className="space-y-3">
            {caseNotes.map((note) => (
              <div key={note.id} className="p-4 border border-border/40 dark:border-border/50 rounded-lg">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  {format(new Date(note.created_at * 1000), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No case-level notes recorded.</p>
        )}
      </ReportSection>
      </div>

      {/* Appendices */}
      <div id="appendices">
        <ReportSection title="Appendices" editable content="" onContentChange={() => {}}>
          <p className="text-muted-foreground">Enter additional content here...</p>
        </ReportSection>
      </div>
    </>
  )
}

