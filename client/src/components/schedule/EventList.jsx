import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Clock, Trash2, Pencil, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { deleteEvent, updateEvent } from '@/services/events';

const categoryConfig = {
  meeting:      { label: 'Meeting',       icon: '👥', color: 'bg-blue-500',    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/60' },
  presentation: { label: 'Presentation',  icon: '📊', color: 'bg-purple-500',  badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/60' },
  deadline:     { label: 'Deadline',       icon: '⏰', color: 'bg-red-500',     badgeBg: 'bg-red-50 text-red-700 border-red-200/60' },
  study:        { label: 'Study Session',  icon: '📚', color: 'bg-emerald-500', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  lecture:      { label: 'Lecture',        icon: '🎓', color: 'bg-indigo-500',  badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60' },
  social:       { label: 'Social',        icon: '🎉', color: 'bg-amber-500',   badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/60' },
  other:        { label: 'Other',         icon: '📌', color: 'bg-gray-400',    badgeBg: 'bg-gray-50 text-gray-600 border-gray-200/60' },
};

export default function EventList({ events = [], roomId, onEventsChange }) {
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const sorted = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const eventId = confirmDelete.id;
    setConfirmDelete(null);
    setDeletingId(eventId);
    try {
      await deleteEvent(roomId, eventId);
      onEventsChange?.((prev) => prev.filter((event) => event.id !== eventId));
    } catch {
      // fail silently
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditOpen = (event) => {
    setEditEvent(event);
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : null;
    setEditForm({
      title: event.title || '',
      description: event.description || '',
      location_name: event.location_name || event.location || '',
      start_date: format(start, 'yyyy-MM-dd'),
      start_time: format(start, 'HH:mm'),
      end_time: end ? format(end, 'HH:mm') : '',
    });
  };

  const handleEditSave = async () => {
    if (!editEvent) return;
    setEditLoading(true);
    try {
      const startDt = new Date(`${editForm.start_date}T${editForm.start_time}`);
      const updates = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        location_name: editForm.location_name.trim() || null,
        start_time: startDt.toISOString(),
      };
      if (editForm.end_time) {
        updates.end_time = new Date(`${editForm.start_date}T${editForm.end_time}`).toISOString();
      }
      const updatedEvent = await updateEvent(roomId, editEvent.id, updates);
      onEventsChange?.((prev) =>
        prev.map((event) => (
          event.id === editEvent.id
            ? { ...event, ...updatedEvent }
            : event
        ))
      );
      setEditEvent(null);
    } catch {
      // fail silently
    } finally {
      setEditLoading(false);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
          <span className="text-3xl">📅</span>
        </div>
        <p className="text-sm font-semibold text-muted-foreground/60">No events yet</p>
        <p className="text-xs text-muted-foreground/40 mt-1.5 max-w-[200px] leading-relaxed">Click a date on the calendar to add your first event</p>
      </div>
    );
  }

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
              <div className="sticky top-0 z-10 flex items-center gap-3 pb-3">
                <div className="flex flex-col items-center rounded-xl border border-border/40 bg-white px-3.5 py-2 shadow-card">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-xl font-bold leading-tight">{format(date, 'd')}</span>
                  <span className="text-[10px] text-muted-foreground/60">{format(date, 'MMM')}</span>
                </div>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="ml-[56px] space-y-2.5">
                {dayEvents.map((event) => {
                  const cat = categoryConfig[event.category] || categoryConfig.other;
                  const startDt = new Date(event.start_time);
                  const endDt = event.end_time ? new Date(event.end_time) : null;
                  const locationName = event.location_name || event.location;
                  const isExpanded = expandedId === event.id;

                  return (
                    <div key={event.id} className="group relative flex gap-3 rounded-xl border border-border/40 bg-white p-3.5 shadow-card transition-all duration-200 hover:shadow-card-hover">
                      <div className={`w-1 shrink-0 rounded-full ${cat.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 leading-4 gap-1 font-medium rounded-full border ${cat.badgeBg}`}>
                                <span>{cat.icon}</span>
                                {cat.label}
                              </Badge>
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                                <Clock className="h-3 w-3 opacity-60" />
                                {format(startDt, 'h:mm a')}
                                {endDt && <> – {format(endDt, 'h:mm a')}</>}
                              </span>
                            </div>
                            <p className="font-semibold text-sm leading-snug">{event.title}</p>
                            {locationName && (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground/60 mt-1.5">
                                <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                                {locationName}
                              </p>
                            )}
                            {event.description && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                                  className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-foreground mt-2 transition-colors duration-150"
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {isExpanded ? 'Hide details' : 'Show details'}
                                </button>
                                <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                  <p className="text-xs text-muted-foreground/70 pl-2 border-l-2 border-border/40 leading-relaxed">
                                    {event.description}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10" onClick={() => handleEditOpen(event)}>
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p>Edit event</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                                  onClick={() => setConfirmDelete({ id: event.id, title: event.title })}
                                  disabled={deletingId === event.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive transition-colors" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p>Delete event</p></TooltipContent>
                            </Tooltip>
                          </div>
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

      {/* Edit event dialog */}
      <Dialog open={!!editEvent} onOpenChange={(open) => !open && setEditEvent(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input className="rounded-xl" value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} disabled={editLoading} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date</label>
                <Input className="rounded-xl" type="date" value={editForm.start_date || ''} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} disabled={editLoading} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start</label>
                <Input className="rounded-xl" type="time" value={editForm.start_time || ''} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} disabled={editLoading} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">End</label>
                <Input className="rounded-xl" type="time" value={editForm.end_time || ''} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} disabled={editLoading} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Input className="rounded-xl" value={editForm.location_name || ''} onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })} disabled={editLoading} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea className="rounded-xl" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} disabled={editLoading} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditEvent(null)} disabled={editLoading}>Cancel</Button>
            <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm" onClick={handleEditSave} disabled={editLoading || !editForm.title?.trim()}>
              {editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
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
