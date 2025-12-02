import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FolderOpen } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { createAppError, logError, ErrorCode } from '@/lib/error-handler';
import { toast } from '@/hooks/useToast';

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaseCreated: (
    name: string,
    folderPath: string,
    caseId?: string,
    department?: string,
    client?: string
  ) => void;
}

export function CreateCaseDialog({ open, onOpenChange, onCaseCreated }: CreateCaseDialogProps) {
  // Pre-populate with dummy data for testing (cross-platform compatible)
  const [name, setName] = useState('Demo Case');
  const [caseId, setCaseId] = useState('CASE-2025-001');
  const [department, setDepartment] = useState('Legal');
  const [client, setClient] = useState('Demo Corp');
  const [folderPath, setFolderPath] = useState(''); // Empty - user must select folder (cross-platform)
  const [loading, setLoading] = useState(false);

  // Reset to dummy data when dialog opens
  useEffect(() => {
    if (open) {
      setName('Demo Case');
      setCaseId('CASE-2025-001');
      setDepartment('Legal');
      setClient('Demo Corp');
      setFolderPath(''); // Empty - user must select folder
    }
  }, [open]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Select folder for case',
      });

      if (selected && typeof selected === 'string') {
        setFolderPath(selected);
        // Auto-fill name from folder if not set
        if (!name) {
          const folderName = selected.split(/[/\\]/).pop() || 'Untitled Case';
          setName(folderName);
        }
      }
    } catch (error) {
      const appError = createAppError(error, ErrorCode.INVALID_PATH);
      logError(appError, 'CreateCaseDialog');
      toast({
        title: 'Failed to select folder',
        description: appError.message,
        variant: 'destructive',
      });
    }
  }, [name]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !folderPath.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onCaseCreated(
        name.trim(),
        folderPath.trim(),
        caseId.trim() || undefined,
        department.trim() || undefined,
        client.trim() || undefined
      );
      // Reset form
      setName('');
      setCaseId('');
      setDepartment('');
      setClient('');
      setFolderPath('');
    } finally {
      setLoading(false);
    }
  }, [name, folderPath, caseId, department, client, onCaseCreated]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setName('');
      setCaseId('');
      setDepartment('');
      setClient('');
      setFolderPath('');
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>
            Create a new case workspace. Select a folder to start ingesting files.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Case Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Smith v. Jones Investigation"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caseId">Case ID</Label>
            <Input
              id="caseId"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="e.g., CASE-2024-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Legal, Finance"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Input
              id="client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="e.g., Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder">Source Folder *</Label>
            <div className="flex gap-2">
              <Input
                id="folder"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Select folder containing files"
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSelectFolder}
                className="flex-shrink-0"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !folderPath.trim() || loading}
          >
            {loading ? 'Creating...' : 'Create Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

