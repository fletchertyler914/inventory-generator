import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { findingService } from '@/services/findingService';
import type { Finding, FindingSeverity } from '@/types/finding';

interface CreateFindingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  finding?: Finding | null;
  onSave: (saved: boolean) => void;
}

export function CreateFindingDialog({
  open,
  onOpenChange,
  caseId,
  finding,
  onSave,
}: CreateFindingDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<FindingSeverity>('medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (finding) {
      setTitle(finding.title);
      setDescription(finding.description);
      setSeverity(finding.severity);
    } else {
      setTitle('');
      setDescription('');
      setSeverity('medium');
    }
  }, [finding, open]);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      return;
    }

    setSaving(true);
    try {
      if (finding) {
        await findingService.updateFinding(finding.id, {
          title: title.trim(),
          description: description.trim(),
          severity,
        });
      } else {
        await findingService.createFinding(
          caseId,
          title.trim(),
          description.trim(),
          severity
        );
      }
      onSave(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save finding:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{finding ? 'Edit Finding' : 'Create Finding'}</DialogTitle>
          <DialogDescription>
            {finding ? 'Update the finding details' : 'Add a new finding to this case'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter finding title..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter finding description..."
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Severity</Label>
            <Select value={severity} onValueChange={(value: FindingSeverity) => setSeverity(value)}>
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim() || !description.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : finding ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

