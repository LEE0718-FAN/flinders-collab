import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { deleteEvent } from '@/services/events';

const categoryConfig = {
  meeting:      { label: 'Meeting',       icon: '👥', color: 'bg-blue-500' },
  presentation: { label: 'Presentation',  icon: '📊', color: 'bg-purple-500' },
  deadline:     { label: 'Deadline',       icon: '⏰', color: 'bg-red-500' },
  study:        { label: 'Study Session',  icon: '📚', color: 'bg-emerald-500' },
  lecture:      { label: 'Lecture',        icon: '🎓', color: 'bg-indigo-500' },
  social:       { label: 'Social',        icon: '🎉', color: 'bg-amber-500' },
  other:        { label: 'Other',         icon: '📌', color: 'bg-gray-400' },
};

export default function EventList({ events = [], roomId, onUpdated }) {
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, title }

  const sorted = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const eventId = confirmDelete.id;
    setConfirmDelete(null);
    setDeletingId(eventId);
    try {
      await deleteEvent(roomId, eventId);
      onUpdated?.();
    } catch {
      // fail silently
    } finally {
      setDeletingId(null);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-3">📅</div>
        <p className="text-sm font-medium text-muted-foreground">No events yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Click a date on the calendar to add one</p>
      </div>
    );
  }

  // Group events by date
  const grouped = {};
  sorted.forEach((event) => {
    const dateKey = format(new Date(event.start_time), 'yyyy-MM-dd');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  });

  return (
    <>
      <div className="space-y-4">
        {Object.entries(grouped).map(([dateKey, dayEvents]) => {
          const date = new Date(dateKey + 'T00:00:00');
          return (
            <div key={dateKey}>
              {/* Date header */}
              <div className="sticky top-0 z-10 flex items-center gap-3 pb-2">
                <div className="flex flex-col items-center rounded-lg border bg-background px-3 py-1.5 shadow-sm">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-lg font-bold leading-tight">{format(date, 'd')}</span>
                  <span className="text-[10px] text-muted-foreground">{format(date, 'MMM')}</span>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Events for this date */}
              <div className="ml-[52px] space-y-2">
                {dayEvents.map((event) => {
                  const cat = categoryConfig[event.category] || categoryConfig.other;
                  const startDt = new Date(event.start_time);
                  const endDt = event.end_time ? new Date(event.end_time) : null;
                  const locationName = event.location_name || event.location;
                  const isExpanded = expandedId === event.id;

                  return (
                    <div
                      key={event.id}
                      className="group relative flex gap-3 rounded-lg border bg-card p-3 transition-all hover:shadow-sm"
                    >
                      {/* Category color bar */}
                      <div className={`w-1 shrink-0 rounded-full ${cat.color}`} />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Category + Time */}
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 leading-4 gap-1 font-normal">
                                <span>{cat.icon}</span>
                                {cat.label}
                              </Badge>
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(startDt, 'h:mm a')}
                                {endDt && <> – {format(endDt, 'h:mm a')}</>}
                              </span>
                            </div>

                            {/* Event title */}
                            <p className="font-medium text-sm leading-snug">{event.title}</p>

                            {/* Location */}
                            {locationName && (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {locationName}
                              </p>
                            )}

                            {/* Expandable description */}
                            {event.description && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-1.5 transition-colors"
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {isExpanded ? 'Hide details' : 'Show details'}
                                </button>
                                {isExpanded && (
                                  <p className="text-xs text-muted-foreground mt-1.5 pl-1 border-l-2 border-border">
                                    {event.description}
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          {/* Delete button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => setConfirmDelete({ id: event.id, title: event.title })}
                                disabled={deletingId === event.id}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>Delete event</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{confirmDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
