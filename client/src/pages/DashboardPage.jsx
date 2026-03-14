import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react';
import MainLayout from '@/layouts/MainLayout';
import RoomCard, { getRoomPalette } from '@/components/room/RoomCard';
import CreateRoomDialog from '@/components/room/CreateRoomDialog';
import JoinRoomDialog from '@/components/room/JoinRoomDialog';
import { getRooms } from '@/services/rooms';
import { getEvents } from '@/services/events';
import { useAuth } from '@/hooks/useAuth';
import { applyRoomOrder, buildOrderedIds, loadRoomOrder, persistRoomOrder } from '@/lib/room-order';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, Plus, UserPlus, LayoutGrid, Clock, CalendarDays } from 'lucide-react';

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
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
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

  useEffect(() => {
    if (rooms.length === 0) return;

    const fetchAllEvents = async () => {
      try {
        const allEvents = [];
        const results = await Promise.allSettled(
          rooms.filter(r => !String(r.id).startsWith(TEMP_ROOM_PREFIX)).map(async (room) => {
            const data = await getEvents(room.id);
            const events = Array.isArray(data) ? data : data.events || [];
            return events.map(e => ({ ...e, room_name: room.name, room_id: room.id }));
          })
        );
        results.forEach(r => { if (r.status === 'fulfilled') allEvents.push(...r.value); });

        const now = new Date();
        const future = allEvents
          .filter(e => new Date(e.start_time) > now)
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

        setUpcomingEvents(future);
      } catch {
        // silently fail
      }
    };

    fetchAllEvents();
  }, [rooms]);

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
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 px-8 py-10 text-white shadow-xl">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-xl" />
          <div className="relative">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Welcome back, {displayName}!</h1>
            <p className="mt-2 text-white/70 text-base">Manage your team rooms and collaborate.</p>
            <div className="flex gap-2 mt-6">
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
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Upcoming Deadlines - intentionally left empty here, rendered at the bottom */}

        {/* Section header */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">Your Rooms</h2>
          {!loading && <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">{rooms.length}</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="rounded-2xl bg-white shadow-card p-10 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-sm text-muted-foreground">Loading your rooms...</p>
            </div>
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                className={`rounded-lg ${
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
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-indigo-200 p-16 text-center">
            <LayoutGrid className="h-12 w-12 mx-auto text-indigo-300 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No rooms yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Create a room to start collaborating with your team, or join an existing room with an invite code.
            </p>
          </div>
        )}

        {/* Upcoming Deadlines Section */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-bold text-foreground">Upcoming Deadlines</h2>
              <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">{upcomingEvents.length}</span>
            </div>
            <div className="space-y-2.5">
              {upcomingEvents.map((event) => {
                const startDate = new Date(event.start_time);
                const now = new Date();
                const diffMs = startDate - now;
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                const palette = getRoomPalette({ id: event.room_id, name: event.room_name });
                let badgeText = `D-${diffDays}`;
                let badgeBg = 'bg-emerald-100 text-emerald-700';
                if (diffDays <= 0) { badgeText = 'TODAY'; badgeBg = 'bg-red-100 text-red-700'; }
                else if (diffDays === 1) { badgeText = 'D-1'; badgeBg = 'bg-red-100 text-red-700'; }
                else if (diffDays <= 3) { badgeBg = 'bg-orange-100 text-orange-700'; }
                else if (diffDays <= 7) { badgeBg = 'bg-yellow-100 text-yellow-700'; }

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                    style={{ borderLeftWidth: '4px', borderLeftColor: palette.accent }}
                    onClick={() => navigate(`/rooms/${event.room_id}`)}
                  >
                    {/* Room color dot */}
                    <div
                      className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center"
                      style={{ background: palette.pillBg }}
                    >
                      <CalendarDays className="h-5 w-5" style={{ color: palette.pillText }} />
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: palette.pillBg, color: palette.pillText }}
                        >
                          {event.room_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(startDate, 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>

                    {/* Time remaining */}
                    <div className="shrink-0 text-right">
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${badgeBg}`}>
                        {badgeText}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {formatDistanceToNow(startDate, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
