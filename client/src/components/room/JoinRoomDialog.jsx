import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { joinRoom } from '@/services/rooms';

export default function JoinRoomDialog({ onJoined }) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = inviteCode.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter an invite code.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await joinRoom(trimmed);
      const roomName = result?.room?.name || 'the room';
      setSuccess(`Joined "${roomName}" successfully!`);
      setInviteCode('');
      onJoined?.();
      // Auto-close after a brief moment so the user sees the success message
      setTimeout(() => {
        setOpen(false);
        setSuccess('');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to join room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      setError('');
      setSuccess('');
      setInviteCode('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Join Room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Room</DialogTitle>
          <DialogDescription>Enter the invite code shared by your team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="invite-code-input" className="text-sm font-medium">Invite Code</label>
            <Input
              id="invite-code-input"
              placeholder="e.g. A1B2C3D4"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                if (error) setError('');
              }}
              autoComplete="off"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}
          {success && (
            <p className="flex items-center gap-1 text-sm text-green-600" role="status">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading || !!success}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join Room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
