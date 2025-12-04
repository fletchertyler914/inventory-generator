import { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { Calendar, Edit2, Save, Plus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { timelineService } from '@/services/timelineService';
import type { TimelineEvent } from '@/types/timeline';
import { CreateTimelineEventDialog } from './CreateTimelineEventDialog';
import { PanelContainer } from '../panel/PanelContainer';
import { PanelHeader } from '../panel/PanelHeader';
import { PanelContent } from '../panel/PanelContent';
import { PanelCard } from '../panel/PanelCard';
import { PanelEmptyState } from '../panel/PanelEmptyState';

interface TimelineViewProps {
  caseId: string;
  currentFileId?: string;
}

/**
 * TimelineView - Timeline event viewer and editor
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized to prevent unnecessary re-renders
 * - Optimized event handlers with useCallback
 * - Memoized grouped events computation
 */
export const TimelineView = memo(function TimelineView({ caseId, currentFileId }: TimelineViewProps) {
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
      <PanelContainer>
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading timeline...</div>
        </div>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer>
      <PanelHeader
        title="Timeline"
        count={events.length}
        onCreate={() => setCreateDialogOpen(true)}
        createButtonLabel=""
      />

      <PanelContent>
        {groupedEvents.length === 0 ? (
          <PanelEmptyState
            icon={Calendar}
            title="No timeline events yet"
            description="Click the + button above to create one"
          />
        ) : (
          <div className="space-y-4">
            {groupedEvents.map((group, groupIndex) => (
              <div key={group.dateKey} className="space-y-2.5">
                {/* Date Header */}
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <h3 className="text-xs font-semibold text-foreground">
                    {format(group.date, 'MMMM d, yyyy')}
                  </h3>
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {group.events.length} event{group.events.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* Events */}
                {group.events.map((event) => {
                  const isEditing = editingEventId === event.id;
                  const isActive = currentFileId && event.source_file_id === currentFileId;
                  
                  return (
                    <PanelCard
                      key={event.id}
                      className={isActive ? 'bg-primary/5 border-l-2 border-l-primary/30 dark:bg-primary/10' : ''}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            placeholder="Enter event description..."
                            className="min-h-[80px] text-sm"
                            autoFocus
                          />
                          <div className="flex gap-1.5 justify-end pt-2 border-t border-border/40 dark:border-border/50">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleSaveDescription(event.id)}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                            <div
                              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(event);
                                }}
                                title="Edit event"
                              >
                                <Edit2 className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEvent(event.id);
                                }}
                                title="Delete event"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap line-clamp-3">
                            {event.description}
                          </p>
                        </>
                      )}
                    </PanelCard>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </PanelContent>

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
    </PanelContainer>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.caseId === nextProps.caseId &&
    prevProps.currentFileId === nextProps.currentFileId
  )
})

