import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DateField, TimeField } from '@/components/ui/date-time-field';
import { Loader2, MapPin } from 'lucide-react';
import { createEvent } from '@/services/events';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'meeting', label: 'Meeting', icon: '👥' },
  { value: 'submission', label: 'Submission', icon: '📮' },
  { value: 'quiz', label: 'Quiz', icon: '✏️' },
  { value: 'exam', label: 'Exam', icon: '📝' },
  { value: 'presentation', label: 'Presentation', icon: '📊' },
  { value: 'deadline', label: 'Deadline', icon: '⏰' },
  { value: 'study', label: 'Study Session', icon: '📚' },
  { value: 'lecture', label: 'Lecture', icon: '🎓' },
  { value: 'social', label: 'Social', icon: '🎉' },
  { value: 'other', label: 'Other', icon: '📌' },
];

export default function EventForm({ roomId, onCreateStart, onCreated, onCreateError, selectedDate, open, onOpenChange }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('meeting');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [locationName, setLocationName] = useState('');
  const [enableLocationSharing, setEnableLocationSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setCategory('meeting');
      setStartTime('09:00');
      setEndTime('10:00');
      setLocationName('');
      setEnableLocationSharing(false);
      setError('');
    }
  }, [open]);

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const displayDate = selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!dateStr) {
      setError('Please select a date from the calendar.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const start = new Date(`${dateStr}T${startTime}`).toISOString();
    const end = new Date(`${dateStr}T${endTime}`).toISOString();

    if (new Date(end) <= new Date(start)) {
      setError('End time must be after start time.');
      return;
    }

    if (enableLocationSharing && !locationName.trim()) {
      setError('Location name is required when location sharing is enabled.');
      return;
    }

    setLoading(true);
    const tempEventId = `temp-event-${Date.now()}`;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      start_time: start,
      end_time: end,
      location_name: locationName.trim() || undefined,
      enable_location_sharing: enableLocationSharing,
    };
    try {
      onCreateStart?.({
        id: tempEventId,
        room_id: roomId,
        ...payload,
      });

      const createdEvent = await createEvent(roomId, payload);
      onOpenChange(false);
      onCreated?.(createdEvent, tempEventId);
    } catch (err) {
      onCreateError?.(tempEventId);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-0.5rem)] w-[calc(100vw-0.5rem)] max-w-[560px] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[28px] p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-full">
        <DialogHeader className="border-b border-slate-100 px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogTitle className="text-lg font-bold">New Event</DialogTitle>
          <DialogDescription className="text-slate-500">{displayDate}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
          {/* Category selection */}
          <div className="space-y-2.5">
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((c) => {
                const isSelected = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-[11px] transition-all duration-200 sm:min-h-[96px] sm:text-xs ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-offset-1 ring-blue-500/30 bg-blue-50 text-blue-700 font-bold shadow-md'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-500'
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>{c.icon}</span>
                    <span className="w-full text-center leading-tight break-words">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold text-slate-700">Event Title</label>
            <Input
              className="rounded-xl border-slate-200 focus:border-blue-400"
              placeholder="e.g. Group Meeting, Final Presentation..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Date and Time */}
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <DateField
                label="Date"
                value={dateStr}
                readOnly
                disabled
                inputClassName="cursor-default"
                className="md:col-span-1"
              />
              <TimeField
                label="Start"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <TimeField
                label="End"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-400">Choose a precise start and end time for this event.</p>
          </div>

          {/* Location */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold text-slate-700">Location <span className="text-slate-400 font-normal">(optional)</span></label>
            <Input className="rounded-xl border-slate-200" placeholder="e.g. Flinders Library Room 3" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
          </div>

          {/* Location Sharing Toggle */}
          {locationName.trim() && (
            <button
              type="button"
              onClick={() => setEnableLocationSharing((v) => !v)}
              className={`flex items-center gap-2.5 w-full rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 ${
                enableLocationSharing
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold shadow-md shadow-blue-500/10'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-500'
              }`}
            >
              <MapPin className={`h-4 w-4 ${enableLocationSharing ? 'text-blue-600' : 'text-slate-400'}`} />
              Enable live location sharing for this event
            </button>
          )}

          {/* Description */}
          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <Textarea
              className="rounded-xl border-slate-200"
              placeholder="Add any details about this event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}
          <div className="sticky bottom-0 mt-4 bg-background/95 pb-[max(0rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:static sm:bg-transparent sm:p-0">
            <Button type="submit" className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
