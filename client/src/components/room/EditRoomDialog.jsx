import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Loader2 } from 'lucide-react';
import { updateRoom } from '@/services/rooms';

export default function EditRoomDialog({ room, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = () => {
    setName(room.name || '');
    setDescription(room.description || '');
    setCourseName(room.course_name || room.course_code || '');
    setError('');
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await updateRoom(room.id, {
        name: name.trim(),
        description: description.trim(),
        course_name: courseName.trim() || null,
      });
      setOpen(false);
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Failed to update room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg" onClick={handleOpen}>
        <Pencil className="h-3.5 w-3.5" />
        Edit Room
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">Room Name <span className="text-red-500">*</span></label>
              <Input className="rounded-xl" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">Course Code</label>
              <Input className="rounded-xl" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. COMP3000" disabled={loading} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground/80">Description</label>
              <Textarea className="rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={loading} />
            </div>
            {error && <div className="rounded-xl bg-red-50 border border-red-200/60 p-3 text-sm text-red-600">{error}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md" disabled={loading || !name.trim()}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
