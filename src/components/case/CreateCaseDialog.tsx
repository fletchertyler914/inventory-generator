import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FolderOpen, File, X } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { createAppError, logError, ErrorCode } from '@/lib/error-handler';
import { toast } from '@/hooks/useToast';

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaseCreated: (
    name: string,
    sources: string[],
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
  const [sources, setSources] = useState<string[]>([]); // Array of file/folder paths
  const [loading, setLoading] = useState(false);

  // Reset to dummy data when dialog opens
  useEffect(() => {
    if (open) {
      setName('Demo Case');
      setCaseId('CASE-2025-001');
      setDepartment('Legal');
      setClient('Demo Corp');
      setSources([]); // Empty - user must select sources
    }
  }, [open]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: true,
        title: 'Select folder(s) for case',
      });

      if (selected) {
        const newSources = Array.isArray(selected) ? selected : [selected];
        setSources(prev => {
          const combined = [...prev, ...newSources];
          // Remove duplicates
          return Array.from(new Set(combined));
        });
        // Auto-fill name from first folder if not set
        if (!name && newSources.length > 0 && newSources[0]) {
          const folderName = newSources[0].split(/[/\\]/).pop() || 'Untitled Case';
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

  const handleSelectFile = useCallback(async () => {
    try {
      const selected = await openDialog({
        directory: false,
        multiple: true,
        title: 'Select file(s) for case',
      });

      if (selected) {
        const newSources = Array.isArray(selected) ? selected : [selected];
        setSources(prev => {
          const combined = [...prev, ...newSources];
          // Remove duplicates
          return Array.from(new Set(combined));
        });
      }
    } catch (error) {
      const appError = createAppError(error, ErrorCode.INVALID_PATH);
      logError(appError, 'CreateCaseDialog');
      toast({
        title: 'Failed to select file',
        description: appError.message,
        variant: 'destructive',
      });
    }
  }, []);

  const handleRemoveSource = useCallback((index: number) => {
    setSources(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || sources.length === 0) {
      return;
    }

    setLoading(true);
    try {
      await onCaseCreated(
        name.trim(),
        sources,
        caseId.trim() || undefined,
        department.trim() || undefined,
        client.trim() || undefined
      );
      // Reset form
      setName('');
      setCaseId('');
      setDepartment('');
      setClient('');
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, [name, sources, caseId, department, client, onCaseCreated]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setName('');
      setCaseId('');
      setDepartment('');
      setClient('');
      setSources([]);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>
            Create a new case workspace. Select one or more files or folders as sources.
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
            <Label>Sources *</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectFolder}
                  className="flex-1"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Add Folder(s)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectFile}
                  className="flex-1"
                >
                  <File className="h-4 w-4 mr-2" />
                  Add File(s)
                </Button>
              </div>
              {sources.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                  {sources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-2 p-2 bg-muted rounded text-sm"
                    >
                      <span className="flex-1 truncate" title={source}>
                        {source.split(/[/\\]/).pop() || source}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSource(index)}
                        className="h-6 w-6 p-0 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {sources.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No sources selected. Add at least one file or folder.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || sources.length === 0 || loading}
          >
            {loading ? 'Creating...' : 'Create Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

