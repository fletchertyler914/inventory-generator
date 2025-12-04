import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Columns } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { caseService } from '@/services/caseService';
import { ColumnManager } from '../table/ColumnManager';
import { getColumnConfig, saveColumnConfig, type TableColumnConfig } from '@/types/tableColumns';
import type { Case } from '@/types/case';

interface EditCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  case_: Case | null;
  onCaseUpdated: () => void;
}

export function EditCaseDialog({ open, onOpenChange, case_, onCaseUpdated }: EditCaseDialogProps) {
  const [name, setName] = useState('');
  const [caseId, setCaseId] = useState('');
  const [department, setDepartment] = useState('');
  const [client, setClient] = useState('');
  const [loading, setLoading] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState<TableColumnConfig>(() =>
    case_ ? getColumnConfig(case_.id) : { columns: [], version: 1 }
  );

  // Populate form with case data when dialog opens or case changes
  useEffect(() => {
    if (open && case_) {
      setName(case_.name || '');
      setCaseId(case_.case_id || '');
      setDepartment(case_.department || '');
      setClient(case_.client || '');
      setColumnConfig(getColumnConfig(case_.id));
    }
  }, [open, case_]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !case_) {
      return;
    }

    setLoading(true);
    try {
      await caseService.updateCaseMetadata(case_.id, {
        name: name.trim(),
        ...(caseId.trim() ? { caseId: caseId.trim() } : {}),
        ...(department.trim() ? { department: department.trim() } : {}),
        ...(client.trim() ? { client: client.trim() } : {}),
      });
      
      toast({
        title: 'Case updated',
        description: 'Case metadata has been successfully updated.',
      });
      
      onCaseUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update case:', error);
      toast({
        title: 'Failed to update case',
        description: error instanceof Error ? error.message : 'An error occurred while updating the case.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [name, caseId, department, client, case_, onCaseUpdated, onOpenChange]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      if (case_) {
        setName(case_.name || '');
        setCaseId(case_.case_id || '');
        setDepartment(case_.department || '');
        setClient(case_.client || '');
      }
    }
    onOpenChange(newOpen);
  }, [onOpenChange, case_]);

  if (!case_) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Case</DialogTitle>
          <DialogDescription>
            Update case metadata. Sources can be managed separately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Case Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smith v. Jones Investigation"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-caseId">Case ID</Label>
            <Input
              id="edit-caseId"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="e.g., CASE-2024-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-department">Department</Label>
            <Input
              id="edit-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Legal, Finance"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-client">Client</Label>
            <Input
              id="edit-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="e.g., Acme Corp"
            />
          </div>
          <div className="space-y-2 pt-2 border-t border-border/40 dark:border-border/50">
            <Label>Table Settings</Label>
            <Button
              variant="outline"
              onClick={() => setColumnManagerOpen(true)}
              className="w-full justify-start"
            >
              <Columns className="h-4 w-4 mr-2" />
              Customize Table Columns
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
          >
            {loading ? 'Updating...' : 'Update Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Column Manager Dialog */}
      {case_ && (
        <ColumnManager
          open={columnManagerOpen}
          onOpenChange={setColumnManagerOpen}
          config={columnConfig}
          onConfigChange={(newConfig) => {
            setColumnConfig(newConfig);
            saveColumnConfig(newConfig, case_.id).catch(console.error);
          }}
          caseId={case_.id}
        />
      )}
    </Dialog>
  );
}

