import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { createEvent } from '@/services/events';

const CATEGORIES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'lecture', label: 'Lecture' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'study', label: 'Study Session' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' },
];

export default function EventForm({ roomId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('meeting');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [enableLocation, setEnableLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('meeting');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setLocationName('');
    setEnableLocation(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!startDate) {
      setError('Start date is required.');
      return;
    }

    const start = startDate && startTime
      ? new Date(`${startDate}T${startTime}`).toISOString()
      : new Date(`${startDate}T00:00`).toISOString();

    const eDate = endDate || startDate;
    const eTime = endTime || (startTime ? (() => {
      const [h, m] = startTime.split(':');
      return `${String(Math.min(23, parseInt(h) + 1)).padStart(2, '0')}:${m}`;
    })() : '23:59');
    const end = new Date(`${eDate}T${eTime}`).toISOString();

    if (new Date(end) <= new Date(start)) {
      setError('End time must be after start time.');
      return;
    }

    setLoading(true);
    try {
      await createEvent(roomId, {
        title,
        description: description || undefined,
        category,
        start_time: start,
        end_time: end,
        location_name: locationName || undefined,
        enable_location_sharing: enableLocation,
      });
      setOpen(false);
      resetForm();
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>Schedule a new event for your team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date & Time</label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }} required />
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Defaults to 1 hour after start if not set.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Location (optional)</label>
            <Input placeholder="e.g. Flinders Library Room 3" value={locationName} onChange={(e) => setLocationName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea placeholder="Event details" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableLocation"
              checked={enableLocation}
              onChange={(e) => setEnableLocation(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <label htmlFor="enableLocation" className="text-sm">Enable location sharing for this event</label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Event
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
