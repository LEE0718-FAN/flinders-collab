import React, { useState, useEffect, useCallback } from 'react';
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
import { MapPin, Clock, Trash2, Pencil, ChevronDown, ChevronUp, Loader2, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { deleteEvent, updateEvent } from '@/services/events';
import { getLocationStatus } from '@/services/location';
import { useAuth } from '@/hooks/useAuth';
import LocationToggle from '@/components/location/LocationToggle';
import LocationMap from '@/components/location/LocationMap';

const categoryConfig = {
  meeting:      { label: 'Meeting',       icon: '👥', color: 'bg-blue-500',    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/60', borderColor: 'border-l-blue-500' },
  presentation: { label: 'Presentation',  icon: '📊', color: 'bg-purple-500',  badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/60', borderColor: 'border-l-purple-500' },
  deadline:     { label: 'Deadline',       icon: '⏰', color: 'bg-red-500',     badgeBg: 'bg-red-50 text-red-700 border-red-200/60', borderColor: 'border-l-red-500' },
  study:        { label: 'Study Session',  icon: '📚', color: 'bg-emerald-500', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', borderColor: 'border-l-emerald-500' },
  lecture:      { label: 'Lecture',        icon: '🎓', color: 'bg-indigo-500',  badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60', borderColor: 'border-l-indigo-500' },
  social:       { label: 'Social',        icon: '🎉', color: 'bg-amber-500',   badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/60', borderColor: 'border-l-amber-500' },
  other:        { label: 'Other',         icon: '📌', color: 'bg-gray-400',    badgeBg: 'bg-gray-50 text-gray-600 border-gray-200/60', borderColor: 'border-l-gray-400' },
};

export default function EventList({ events = [], roomId, onEventsChange }) {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [activeMapEventId, setActiveMapEventId] = useState(null);
  const [locationMembers, setLocationMembers] = useState({});
  const [sharingEventIds, setSharingEventIds] = useState(new Set());

  // Fetch location status for events that have location sharing enabled
  const fetchLocationStatus = useCallback(async (eventId) => {
    try {
      const data = await getLocationStatus(eventId);
      const members = Array.isArray(data) ? data : [];
      setLocationMembers((prev) => ({ ...prev, [eventId]: members }));
      // Check if current user is sharing
      const userSession = members.find(
        (m) => String(m.user_id) === String(user?.id) && m.status !== 'stopped'
      );
      setSharingEventIds((prev) => {
        const next = new Set(prev);
        if (userSession) next.add(eventId);
        else next.delete(eventId);
        return next;
      });
    } catch {
      // non-critical
    }
  }, [user?.id]);

  // Load location status for location-enabled events
  useEffect(() => {
    const locationEvents = events.filter((e) => e.enable_location_sharing);
    locationEvents.forEach((e) => fetchLocationStatus(e.id));
  }, [events, fetchLocationStatus]);

  // Auto-refresh location data for the active map event
  useEffect(() => {
    if (!activeMapEventId) return;
    const interval = setInterval(() => fetchLocationStatus(activeMapEventId), 15000);
    return () => clearInterval(interval);
  }, [activeMapEventId, fetchLocationStatus]);

  const handleLocationToggle = useCallback(
    (eventId, sharing) => {
      setSharingEventIds((prev) => {
        const next = new Set(prev);
        if (sharing) next.add(eventId);
        else next.delete(eventId);
        return next;
      });
      // Refresh location data after toggle
      setTimeout(() => fetchLocationStatus(eventId), 500);
    },
    [fetchLocationStatus],
  );

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
      enable_location_sharing: event.enable_location_sharing || false,
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
        enable_location_sharing: editForm.enable_location_sharing || false,
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
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-lg shadow-blue-500/10">
          <span className="text-3xl">📅</span>
        </div>
        <p className="text-sm font-bold text-slate-500">No events yet</p>
        <p className="text-xs text-slate-400 mt-1.5 max-w-[200px] leading-relaxed">Click a date on the calendar to add your first event</p>
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
      <div className="space-y-5">
        {Object.entries(grouped).map(([dateKey, dayEvents]) => {
          const date = new Date(dateKey + 'T00:00:00');
          return (
            <div key={dateKey}>
              <div className="sticky top-0 z-10 flex items-center gap-3 pb-3">
                <div className="flex flex-col items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-3 shadow-lg shadow-blue-500/20 min-w-[64px]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                    {format(date, 'EEE')}
                  </span>
                  <span className="text-2xl font-black leading-tight text-white">{format(date, 'd')}</span>
                  <span className="text-[10px] text-white/80">{format(date, 'MMM')}</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent" />
              </div>

              <div className="ml-[76px] space-y-2.5">
                {dayEvents.map((event) => {
                  const cat = categoryConfig[event.category] || categoryConfig.other;
                  const startDt = new Date(event.start_time);
                  const endDt = event.end_time ? new Date(event.end_time) : null;
                  const locationName = event.location_name || event.location;
                  const isExpanded = expandedId === event.id;

                  return (
                    <div key={event.id} className={`group relative rounded-xl border border-slate-200/60 border-l-4 ${cat.borderColor} bg-white p-4 shadow-md shadow-slate-200/50 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/70 hover:-translate-y-0.5`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge variant="outline" className={`text-[10px] px-2.5 py-0.5 leading-4 gap-1 font-semibold rounded-full border ${cat.badgeBg}`}>
                                <span>{cat.icon}</span>
                                {cat.label}
                              </Badge>
                              <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                <Clock className="h-3 w-3 opacity-60" />
                                {format(startDt, 'h:mm a')}
                                {endDt && <> – {format(endDt, 'h:mm a')}</>}
                              </span>
                            </div>
                            <p className="font-bold text-sm leading-snug text-slate-800">{event.title}</p>
                            {locationName && (
                              <p className="flex items-center gap-1 text-xs text-slate-500 mt-1.5">
                                <MapPin className="h-3 w-3 shrink-0 text-blue-400" />
                                {locationName}
                              </p>
                            )}
                            {event.description && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                                  className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 mt-2 transition-colors duration-150 font-medium"
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                  {isExpanded ? 'Hide details' : 'Show details'}
                                </button>
                                {isExpanded && (
                                  <p className="text-xs text-slate-600 mt-1.5 pl-3 border-l-2 border-blue-200 leading-relaxed">
                                    {event.description}
                                  </p>
                                )}
                              </>
                            )}
                            {/* Location sharing controls */}
                            {event.enable_location_sharing && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <LocationToggle
                                    roomId={roomId}
                                    eventId={event.id}
                                    isSharing={sharingEventIds.has(event.id)}
                                    onToggle={(sharing) => handleLocationToggle(event.id, sharing)}
                                  />
                                  {(locationMembers[event.id]?.length || 0) > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => setActiveMapEventId(activeMapEventId === event.id ? null : event.id)}
                                    >
                                      <Navigation className="mr-1.5 h-3 w-3" />
                                      {activeMapEventId === event.id ? 'Hide Map' : `Map (${locationMembers[event.id].length})`}
                                    </Button>
                                  )}
                                </div>
                                {activeMapEventId === event.id && (
                                  <LocationMap members={locationMembers[event.id] || []} />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-blue-50" onClick={() => handleEditOpen(event)}>
                                  <Pencil className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p>Edit event</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg hover:bg-red-50"
                                  onClick={() => setConfirmDelete({ id: event.id, title: event.title })}
                                  disabled={deletingId === event.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
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
            <DialogTitle className="text-lg font-bold">Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Title</label>
              <Input className="rounded-xl border-slate-200" value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} disabled={editLoading} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Date</label>
                <Input className="rounded-xl border-slate-200" type="date" value={editForm.start_date || ''} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} disabled={editLoading} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Start</label>
                <Input className="rounded-xl border-slate-200" type="time" value={editForm.start_time || ''} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} disabled={editLoading} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">End</label>
                <Input className="rounded-xl border-slate-200" type="time" value={editForm.end_time || ''} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} disabled={editLoading} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Location</label>
              <Input className="rounded-xl border-slate-200" value={editForm.location_name || ''} onChange={(e) => setEditForm({ ...editForm, location_name: e.target.value })} disabled={editLoading} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <Textarea className="rounded-xl border-slate-200" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} disabled={editLoading} />
            </div>
            {editForm.location_name?.trim() && (
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, enable_location_sharing: !editForm.enable_location_sharing })}
                disabled={editLoading}
                className={`flex items-center gap-2.5 w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 ${
                  editForm.enable_location_sharing
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-500'
                }`}
              >
                <MapPin className={`h-4 w-4 ${editForm.enable_location_sharing ? 'text-blue-600' : 'text-slate-400'}`} />
                Enable live location sharing
              </button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditEvent(null)} disabled={editLoading}>Cancel</Button>
            <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25" onClick={handleEditSave} disabled={editLoading || !editForm.title?.trim()}>
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
