import { useState, useEffect, useCallback } from "react"
import { Plus, AlertCircle, AlertTriangle, Info, XCircle } from "lucide-react"
import { Badge } from "../ui/badge"
import { findingService } from "@/services/findingService"
import type { Finding } from "@/types/finding"
import { CreateFindingDialog } from "./CreateFindingDialog"
import { PanelContainer } from "../panel/PanelContainer"
import { PanelHeader } from "../panel/PanelHeader"
import { PanelContent } from "../panel/PanelContent"
import { PanelEmptyState } from "../panel/PanelEmptyState"
import { PanelCard } from "../panel/PanelCard"

interface FindingsPanelProps {
  caseId: string
  onClose?: () => void
}

const severityConfig: Record<
  Finding["severity"],
  {
    label: string
    icon: typeof AlertCircle
    variant: "default" | "destructive" | "secondary" | "outline"
  }
> = {
  low: { label: "Low", icon: Info, variant: "secondary" },
  medium: { label: "Medium", icon: AlertCircle, variant: "outline" },
  high: { label: "High", icon: AlertTriangle, variant: "default" },
  critical: { label: "Critical", icon: XCircle, variant: "destructive" },
}

export function FindingsPanel({ caseId, onClose }: FindingsPanelProps) {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null)

  const loadFindings = useCallback(async () => {
    try {
      setLoading(true)
      const loadedFindings = await findingService.listFindings(caseId)
      setFindings(loadedFindings)
    } catch (error) {
      console.error("Failed to load findings:", error)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    loadFindings()
  }, [loadFindings])

  const handleCreate = useCallback(() => {
    setEditingFinding(null)
    setCreateDialogOpen(true)
  }, [])

  const handleEdit = useCallback((finding: Finding) => {
    setEditingFinding(finding)
    setCreateDialogOpen(true)
  }, [])

  // Delete functionality - can be added to UI later if needed

  const handleDialogClose = useCallback(
    (saved: boolean) => {
      setCreateDialogOpen(false)
      setEditingFinding(null)
      if (saved) {
        loadFindings()
      }
    },
    [loadFindings]
  )

  if (loading) {
    return (
      <PanelContainer>
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading findings...</div>
        </div>
      </PanelContainer>
    )
  }

  return (
    <PanelContainer>
      <PanelHeader
        title="Findings"
        count={findings.length}
        onCreate={handleCreate}
        createButtonLabel="New"
        onClose={onClose}
      />

      <PanelContent>
        {findings.length === 0 ? (
          <PanelEmptyState
            icon={Plus}
            title="No findings yet"
            description='Click "New" to create one.'
          />
        ) : (
          findings.map((finding) => {
            const config = severityConfig[finding.severity]
            const SeverityIcon = config.icon

            return (
              <PanelCard key={finding.id} onClick={() => handleEdit(finding)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate">{finding.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {finding.description}
                    </p>
                  </div>
                  <Badge variant={config.variant} className="text-[10px] flex-shrink-0">
                    <SeverityIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {finding.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {finding.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                      {finding.tags.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{finding.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  {finding.linked_files.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {finding.linked_files.length} file
                      {finding.linked_files.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(finding.updated_at * 1000).toLocaleString()}
                </div>
              </PanelCard>
            )
          })
        )}
      </PanelContent>

      {/* Create/Edit Dialog */}
      <CreateFindingDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false)
            setEditingFinding(null)
          }
        }}
        caseId={caseId}
        finding={editingFinding}
        onSave={handleDialogClose}
      />
    </PanelContainer>
  )
}
