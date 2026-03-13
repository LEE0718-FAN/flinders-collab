import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react';
import MainLayout from '@/layouts/MainLayout';
import RoomCard from '@/components/room/RoomCard';
import CreateRoomDialog from '@/components/room/CreateRoomDialog';
import JoinRoomDialog from '@/components/room/JoinRoomDialog';
import { getRooms } from '@/services/rooms';
import { useAuth } from '@/hooks/useAuth';
import { applyRoomOrder, buildOrderedIds, loadRoomOrder, persistRoomOrder } from '@/lib/room-order';
import { Loader2, Plus, UserPlus, Sparkles } from 'lucide-react';

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

function swapRoomOrder(rooms, draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) {
    return rooms;
  }

  const draggedIndex = rooms.findIndex((room) => room.id === draggedId);
  const targetIndex = rooms.findIndex((room) => room.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) {
    return rooms;
  }

  const next = [...rooms];
  [next[draggedIndex], next[targetIndex]] = [next[targetIndex], next[draggedIndex]];
  return next;
}

export default function DashboardPage() {
  const swapDelayMs = 110;
  const swapCooldownMs = 260;
  const sidebarSyncDelayMs = 220;
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggedRoomId, setDraggedRoomId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [suppressNavigation, setSuppressNavigation] = useState(false);
  const roomNodeMapRef = useRef(new Map());
  const previousPositionsRef = useRef(new Map());
  const swapTimerRef = useRef(null);
  const pendingSwapTargetRef = useRef(null);
  const lastSwapAtRef = useRef(0);

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

  useEffect(() => () => {
    if (swapTimerRef.current) {
      window.clearTimeout(swapTimerRef.current);
    }
  }, []);

  useLayoutEffect(() => {
    const nextPositions = new Map();

    rooms.forEach((room) => {
      const node = roomNodeMapRef.current.get(room.id);
      if (!node) return;

      const rect = node.getBoundingClientRect();
      nextPositions.set(room.id, rect);

      const previousRect = previousPositionsRef.current.get(room.id);
      if (!previousRect) return;

      const deltaX = previousRect.left - rect.left;
      const deltaY = previousRect.top - rect.top;

      if (deltaX === 0 && deltaY === 0) return;

      node.style.transition = 'none';
      node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      requestAnimationFrame(() => {
        node.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
        node.style.transform = 'translate(0, 0)';
      });
    });

    previousPositionsRef.current = nextPositions;
  }, [rooms]);

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

  const handleDragStart = useCallback((roomId, event) => {
    setDraggedRoomId(roomId);
    setSuppressNavigation(false);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', roomId);
  }, []);

  const handleDragOverRoom = useCallback((targetRoomId, event) => {
    if (!draggedRoomId || draggedRoomId === targetRoomId || dropTargetId === targetRoomId) {
      return;
    }

    if (Date.now() - lastSwapAtRef.current < swapCooldownMs) {
      return;
    }

    const targetNode = roomNodeMapRef.current.get(targetRoomId);
    const draggedNode = roomNodeMapRef.current.get(draggedRoomId);
    if (!targetNode || !draggedNode) {
      return;
    }

    const targetRect = targetNode.getBoundingClientRect();
    const draggedRect = draggedNode.getBoundingClientRect();
    const targetCenterX = targetRect.left + (targetRect.width / 2);
    const targetCenterY = targetRect.top + (targetRect.height / 2);
    const draggedCenterX = draggedRect.left + (draggedRect.width / 2);
    const draggedCenterY = draggedRect.top + (draggedRect.height / 2);
    const horizontalMove = Math.abs(targetCenterX - draggedCenterX) >= Math.abs(targetCenterY - draggedCenterY);

    const forwardThreshold = 0.35;
    const backwardThreshold = 0.65;
    const crossedThreshold = horizontalMove
      ? (targetCenterX > draggedCenterX
          ? event.clientX >= targetRect.left + (targetRect.width * forwardThreshold)
          : event.clientX <= targetRect.left + (targetRect.width * backwardThreshold))
      : (targetCenterY > draggedCenterY
          ? event.clientY >= targetRect.top + (targetRect.height * forwardThreshold)
          : event.clientY <= targetRect.top + (targetRect.height * backwardThreshold));

    if (!crossedThreshold) {
      if (pendingSwapTargetRef.current === targetRoomId && swapTimerRef.current) {
        window.clearTimeout(swapTimerRef.current);
        swapTimerRef.current = null;
        pendingSwapTargetRef.current = null;
      }
      return;
    }

    if (pendingSwapTargetRef.current === targetRoomId) {
      return;
    }

    if (swapTimerRef.current) {
      window.clearTimeout(swapTimerRef.current);
    }

    pendingSwapTargetRef.current = targetRoomId;
    swapTimerRef.current = window.setTimeout(() => {
      setRooms((prev) => swapRoomOrder(prev, draggedRoomId, targetRoomId));
      setDropTargetId(targetRoomId);
      lastSwapAtRef.current = Date.now();
      pendingSwapTargetRef.current = null;
      swapTimerRef.current = null;
    }, swapDelayMs);
  }, [draggedRoomId, dropTargetId, swapCooldownMs, swapDelayMs]);

  const handleDragEnd = useCallback(() => {
    if (swapTimerRef.current) {
      window.clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
    pendingSwapTargetRef.current = null;
    const nextOrderedIds = buildOrderedIds(rooms, TEMP_ROOM_PREFIX);
    if (user?.id) {
      persistRoomOrder(user.id, nextOrderedIds);
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('room-order-updated', {
          detail: {
            userId: user.id,
            orderedIds: nextOrderedIds,
          },
        }));
      }, sidebarSyncDelayMs);
    }
    setDraggedRoomId(null);
    setDropTargetId(null);
    setSuppressNavigation(true);
    window.setTimeout(() => setSuppressNavigation(false), 150);
  }, [rooms, sidebarSyncDelayMs, user?.id]);

  return (
    <MainLayout onRoomChange={fetchRooms}>
      <div className="space-y-8">
        {/* Hero welcome section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 sm:p-10 text-white">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4 blur-xl" />
          <div className="absolute top-4 right-8 opacity-20">
            <Sparkles className="h-24 w-24" />
          </div>

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-blue-200/80 text-sm font-medium mb-1">Welcome back</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{displayName}</h1>
              <p className="text-blue-100/60 mt-2 text-[15px]">Manage your team rooms and collaborate with your peers.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <CreateRoomDialog
                onCreateStart={handleCreateStart}
                onCreated={handleRoomCreated}
                onCreateError={handleCreateError}
              />
              <JoinRoomDialog onJoined={handleRoomJoined} />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200/60 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-red-500 text-xs font-bold">!</span>
            </div>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
            </div>
            <p className="text-sm text-muted-foreground/50">Loading your rooms...</p>
          </div>
        ) : rooms.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Your Rooms</h2>
              <span className="text-xs text-muted-foreground/40 bg-muted/50 px-2 py-0.5 rounded-full">{rooms.length}</span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  ref={(node) => {
                    if (node) {
                      roomNodeMapRef.current.set(room.id, node);
                    } else {
                      roomNodeMapRef.current.delete(room.id);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    handleDragOverRoom(room.id, e);
                  }}
                  className={`rounded-2xl transition-all duration-300 ease-out ${
                    draggedRoomId === room.id ? 'scale-[0.96] opacity-50 rotate-1' : ''
                  } ${
                    dropTargetId === room.id && draggedRoomId !== room.id
                      ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background'
                      : ''
                  }`}
                >
                  <RoomCard
                    room={room}
                    onDeleted={fetchRooms}
                    suppressNavigation={suppressNavigation}
                    draggableProps={{
                      draggable: true,
                      onDragStart: (event) => handleDragStart(room.id, event),
                      onDragEnd: handleDragEnd,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative rounded-2xl border-2 border-dashed border-border/30 bg-white/60 p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-violet-50/30" />
            <div className="relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 mb-5">
                <Plus className="h-8 w-8 text-primary/40" />
              </div>
              <h3 className="text-xl font-bold text-foreground/80">No rooms yet</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground/60 leading-relaxed">
                Create a room to start collaborating with your team, or join an existing room with an invite code.
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
