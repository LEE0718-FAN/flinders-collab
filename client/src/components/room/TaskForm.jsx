import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { createTask } from '@/services/tasks';

export default function TaskForm({ roomId, members = [], onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setDueDate('');
    setDueTime('');
    setPriority('medium');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!assignedTo) {
      setError('Please select a member to assign this task to.');
      return;
    }

    let due_date = null;
    if (dueDate) {
      const time = dueTime || '23:59';
      due_date = new Date(`${dueDate}T${time}`).toISOString();
    }

    setLoading(true);
    try {
      await createTask(roomId, {
        title,
        description,
        assigned_to: assignedTo,
        due_date,
        priority,
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
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (val) setError(''); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md gap-2">
          <Plus className="h-4 w-4" />
          Assign Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Assign a new task to a team member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Title</label>
            <Input
              className="rounded-xl"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Assign To</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select a member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.name || m.university_email || m.email || 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Due Date (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                className="rounded-xl"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <Input
                className="rounded-xl"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Description (optional)</label>
            <Textarea
              className="rounded-xl"
              placeholder="Task details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200/60 p-3 text-sm text-destructive">{error}</div>}
          <Button type="submit" className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
