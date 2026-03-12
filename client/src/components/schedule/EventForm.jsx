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

export default function EventForm({ roomId, onCreated, selectedDate, open, onOpenChange }) {
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
    try {
      await createEvent(roomId, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        start_time: start,
        end_time: end,
        location_name: locationName.trim() || undefined,
      });
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
          <DialogDescription>{displayDate}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all ${
                    category === c.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:border-primary/40 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <span className="text-base">{c.icon}</span>
                  <span className="truncate w-full text-center leading-tight">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Title</label>
            <Input
              placeholder="e.g. Group Meeting, Final Presentation..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Time */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Time</label>
            <div className="flex items-center gap-2">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="flex-1" />
              <span className="text-sm text-muted-foreground">to</span>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="flex-1" />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Location <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input placeholder="e.g. Flinders Library Room 3" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea
              placeholder="Add any details about this event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Event
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
