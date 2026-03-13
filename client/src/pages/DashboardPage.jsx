import React, { useEffect, useState, useCallback } from 'react';
import MainLayout from '@/layouts/MainLayout';
import RoomCard from '@/components/room/RoomCard';
import CreateRoomDialog from '@/components/room/CreateRoomDialog';
import JoinRoomDialog from '@/components/room/JoinRoomDialog';
import { getRooms } from '@/services/rooms';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus, UserPlus } from 'lucide-react';

const TEMP_ROOM_PREFIX = 'temp-room-';

function upsertRoom(rooms, room, fallback = {}) {
  if (!room?.id) return rooms;

  const nextRoom = {
    member_count: 1,
    my_role: 'member',
    ...fallback,
    ...room,
  };

  const remaining = rooms.filter((item) => item.id !== nextRoom.id);
  return [nextRoom, ...remaining];
}

function getRoomOrderKey(userId) {
  return userId ? `room-order:${userId}` : null;
}

function loadRoomOrder(userId) {
  const key = getRoomOrderKey(userId);
  if (!key) return [];

  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function applyRoomOrder(rooms, orderedIds) {
  if (!orderedIds.length) return rooms;

  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const orderedRooms = orderedIds
    .map((id) => roomMap.get(id))
    .filter(Boolean);
  const remainingRooms = rooms.filter((room) => !orderedIds.includes(room.id));

  return [...orderedRooms, ...remainingRooms];
}

function saveRoomOrder(userId, rooms) {
  const key = getRoomOrderKey(userId);
  if (!key) return;

  const orderedIds = rooms
    .map((room) => room.id)
    .filter((id) => typeof id === 'string' && !id.startsWith(TEMP_ROOM_PREFIX));

  window.localStorage.setItem(key, JSON.stringify(orderedIds));
}

function moveRoom(rooms, draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) {
    return rooms;
  }

  const draggedIndex = rooms.findIndex((room) => room.id === draggedId);
  const targetIndex = rooms.findIndex((room) => room.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) {
    return rooms;
  }

  const next = [...rooms];
  const [draggedRoom] = next.splice(draggedIndex, 1);
  next.splice(targetIndex, 0, draggedRoom);
  return next;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggedRoomId, setDraggedRoomId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  const fetchRooms = useCallback(async () => {
    setError('');
    try {
      const data = await getRooms();
      const nextRooms = data.rooms || data || [];
      setRooms(applyRoomOrder(nextRooms, loadRoomOrder(user?.id)));
    } catch (err) {
      setError('Failed to load rooms. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    saveRoomOrder(user?.id, rooms);
  }, [rooms, user?.id]);

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';
  const handleCreateStart = useCallback((tempRoom) => {
    setRooms((prev) => upsertRoom(prev, tempRoom, { member_count: 1, my_role: 'owner' }));
    setLoading(false);
  }, []);

  const handleRoomCreated = useCallback((room, tempRoomId) => {
    setRooms((prev) => {
      const withoutTemp = tempRoomId
        ? prev.filter((item) => item.id !== tempRoomId)
        : prev;
      return upsertRoom(withoutTemp, room, { member_count: 1, my_role: 'owner' });
    });
    setLoading(false);
  }, []);

  const handleCreateError = useCallback((tempRoomId) => {
    setRooms((prev) => prev.filter((item) => item.id !== tempRoomId));
  }, []);

  const handleRoomJoined = useCallback((room) => {
    setRooms((prev) => upsertRoom(prev, room, { member_count: 1, my_role: 'member' }));
    setLoading(false);
  }, []);

  const handleRoomReorder = useCallback((targetRoomId) => {
    if (!draggedRoomId || draggedRoomId === targetRoomId) {
      setDraggedRoomId(null);
      setDropTargetId(null);
      return;
    }

    setRooms((prev) => moveRoom(prev, draggedRoomId, targetRoomId));
    setDraggedRoomId(null);
    setDropTargetId(null);
  }, [draggedRoomId]);

  const handleDragStart = useCallback((roomId, event) => {
    setDraggedRoomId(roomId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', roomId);
  }, []);

  return (
    <MainLayout onRoomChange={fetchRooms}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, {displayName}!</h1>
            <p className="text-muted-foreground">Manage your team rooms and collaborate.</p>
          </div>
          <div className="flex gap-2">
            <CreateRoomDialog
              onCreateStart={handleCreateStart}
              onCreated={handleRoomCreated}
              onCreateError={handleCreateError}
            />
            <JoinRoomDialog onJoined={handleRoomJoined} />
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
              <div
                key={room.id}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (draggedRoomId && dropTargetId !== room.id) {
                    setDropTargetId(room.id);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dropTargetId !== room.id) {
                    setDropTargetId(room.id);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleRoomReorder(room.id);
                }}
                className={`rounded-lg transition-transform ${
                  draggedRoomId === room.id ? 'scale-[0.98] opacity-70' : ''
                } ${
                  dropTargetId === room.id && draggedRoomId !== room.id
                    ? 'ring-2 ring-primary/50 ring-offset-2'
                    : ''
                }`}
              >
                <RoomCard
                  room={room}
                  onDeleted={fetchRooms}
                  dragHandleProps={{
                    draggable: true,
                    onDragStart: (event) => handleDragStart(room.id, event),
                    onDragEnd: () => {
                      setDraggedRoomId(null);
                      setDropTargetId(null);
                    },
                  }}
                />
              </div>
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
