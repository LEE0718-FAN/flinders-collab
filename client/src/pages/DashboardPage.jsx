import React, { useEffect, useState, useCallback } from 'react';
import MainLayout from '@/layouts/MainLayout';
import RoomCard from '@/components/room/RoomCard';
import CreateRoomDialog from '@/components/room/CreateRoomDialog';
import JoinRoomDialog from '@/components/room/JoinRoomDialog';
import { getRooms } from '@/services/rooms';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, UserPlus } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async () => {
    setError('');
    try {
      const data = await getRooms();
      setRooms(data.rooms || data || []);
    } catch (err) {
      setError('Failed to load rooms. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';

  return (
    <MainLayout onRoomChange={fetchRooms}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, {displayName}!</h1>
            <p className="text-muted-foreground">Manage your team rooms and collaborate.</p>
          </div>
          <div className="flex gap-2">
            <CreateRoomDialog onCreated={fetchRooms} />
            <JoinRoomDialog onJoined={fetchRooms} />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onDeleted={fetchRooms} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <h3 className="text-lg font-semibold">No rooms yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create a room to start collaborating with your team, or join an existing room with an invite code.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
