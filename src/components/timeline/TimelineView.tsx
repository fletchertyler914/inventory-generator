import { useMemo, useState, useEffect, useCallback } from 'react';
import { Calendar, Edit2, Save, Plus, Trash2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { timelineService } from '@/services/timelineService';
import type { TimelineEvent } from '@/types/timeline';
import { CreateTimelineEventDialog } from './CreateTimelineEventDialog';

interface TimelineViewProps {
  caseId: string;
}

export function TimelineView({ caseId }: TimelineViewProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const loadedEvents = await timelineService.listEvents(caseId);
      setEvents(loadedEvents);
    } catch (error) {
      console.error('Failed to load timeline events:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSaveDescription = useCallback(async (eventId: string) => {
    try {
      await timelineService.updateEvent(eventId, undefined, editingDescription, undefined);
      await loadEvents();
      setEditingEventId(null);
      setEditingDescription('');
    } catch (error) {
      console.error('Failed to update timeline event:', error);
    }
  }, [editingDescription, loadEvents]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this timeline event?')) {
      return;
    }
    try {
      await timelineService.deleteEvent(eventId);
      await loadEvents();
    } catch (error) {
      console.error('Failed to delete timeline event:', error);
    }
  }, [loadEvents]);

  const handleStartEdit = useCallback((event: TimelineEvent) => {
    setEditingEventId(event.id);
    setEditingDescription(event.description);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingEventId(null);
    setEditingDescription('');
  }, []);

  const handleDialogClose = useCallback((saved: boolean) => {
    setCreateDialogOpen(false);
    if (saved) {
      loadEvents();
    }
  }, [loadEvents]);

  // Group events by date for display
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, TimelineEvent[]>();
    events.forEach(event => {
      const dateKey = format(new Date(event.event_date * 1000), 'yyyy-MM-dd');
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    });
    return Array.from(groups.entries())
      .map(([dateKey, events]) => ({
        date: new Date(dateKey),
        dateKey,
        events: events.sort((a, b) => a.event_date - b.event_date),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Case Timeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chronological view of events and findings
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Event
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {groupedEvents.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No timeline events yet. Click &quot;New Event&quot; to create one.
            </div>
          ) : (
            groupedEvents.map((group, groupIndex) => (
              <div key={group.dateKey} className="relative">
                {/* Timeline line */}
                {groupIndex < groupedEvents.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
                )}
                
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="rounded-full bg-primary p-2">
                          <Calendar className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold">
                          {format(group.date, 'MMMM d, yyyy')}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {group.events.map((event) => {
                      const isEditing = editingEventId === event.id;
                      
                      return (
                        <div key={event.id} className="p-3 rounded-lg border border-border bg-background">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {event.event_type === 'auto' && (
                                <Badge variant="secondary" className="text-[10px]">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Auto
                                </Badge>
                              )}
                              {event.event_type === 'extracted' && (
                                <Badge variant="outline" className="text-[10px]">
                                  Extracted
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.event_date * 1000), 'h:mm a')}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleStartEdit(event)}
                                title="Edit event"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteEvent(event.id)}
                                title="Delete event"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                placeholder="Enter event description..."
                                className="min-h-[80px] text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveDescription(event.id)}>
                                  <Save className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {event.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Create Event Dialog */}
      <CreateTimelineEventDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
          }
        }}
        caseId={caseId}
        onSave={handleDialogClose}
      />
    </div>
  );
}

