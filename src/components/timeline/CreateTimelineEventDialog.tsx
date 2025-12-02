import { useState, useEffect } from 'react';
import { Save, Calendar } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { format } from 'date-fns';
import { timelineService } from '@/services/timelineService';

interface CreateTimelineEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSave: (saved: boolean) => void;
}

export function CreateTimelineEventDialog({
  open,
  onOpenChange,
  caseId,
  onSave,
}: CreateTimelineEventDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState('12:00');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(new Date());
      setTime('12:00');
      setDescription('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!description.trim()) {
      return;
    }

    setSaving(true);
    try {
      // Combine date and time into Unix timestamp
      const timeParts = time.split(':');
      const hours = parseInt(timeParts[0] || '12', 10);
      const minutes = parseInt(timeParts[1] || '0', 10);
      
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('Invalid time format');
        setSaving(false);
        return;
      }
      
      const eventDate = new Date(date);
      eventDate.setHours(hours, minutes, 0, 0);
      const timestamp = Math.floor(eventDate.getTime() / 1000);

      if (isNaN(timestamp) || timestamp <= 0) {
        console.error('Invalid timestamp calculated');
        setSaving(false);
        return;
      }

      await timelineService.createEvent(
        caseId,
        timestamp,
        description.trim(),
        undefined,
        'manual'
      );
      onSave(true);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create timeline event:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Timeline Event</DialogTitle>
          <DialogDescription>
            Add a new event to the case timeline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter event description..."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !description.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

