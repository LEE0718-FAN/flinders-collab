import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { createEvent } from '@/services/events';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'meeting', label: 'Meeting', icon: '👥' },
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

    setLoading(true);
    const tempEventId = `temp-event-${Date.now()}`;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      start_time: start,
      end_time: end,
      location_name: locationName.trim() || undefined,
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
      <DialogContent className="sm:max-w-[440px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">New Event</DialogTitle>
          <DialogDescription className="text-slate-500">{displayDate}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => {
                const isSelected = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-offset-1 ring-blue-500/30 bg-blue-50 text-blue-700 font-bold shadow-md'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-500'
                    }`}
                  >
                    <span className={`text-lg flex items-center justify-center h-8 w-8 rounded-full ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>{c.icon}</span>
                    <span className="truncate w-full text-center leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
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

          {/* Time */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Time</label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl border-slate-200" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">to</span>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-xl border-slate-200" />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Location <span className="text-slate-400 font-normal">(optional)</span></label>
            <Input className="rounded-xl border-slate-200" placeholder="e.g. Flinders Library Room 3" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <Textarea
              className="rounded-xl border-slate-200"
              placeholder="Add any details about this event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl h-12 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Event
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
