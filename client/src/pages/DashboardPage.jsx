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
import { Loader2, LayoutGrid } from 'lucide-react';

const TEMP_ROOM_PREFIX = 'temp-room-';
const ROOM_NAVIGATION_UPDATED_EVENT = 'rooms-updated';

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
  const [touchOptimized, setTouchOptimized] = useState(false);
  const roomNodeMapRef = useRef(new Map());
  const previousPositionsRef = useRef(new Map());
  const swapTimerRef = useRef(null);
  const pendingSwapTargetRef = useRef(null);
  const lastSwapAtRef = useRef(0);

  const broadcastRoomUpdate = useCallback((nextRooms) => {
    window.dispatchEvent(new CustomEvent(ROOM_NAVIGATION_UPDATED_EVENT, {
      detail: {
        userId: user?.id,
        rooms: nextRooms,
      },
    }));
  }, [user?.id]);

  const fetchRooms = useCallback(async () => {
    setError('');
    try {
      const data = await getRooms();
      const nextRooms = data.rooms || data || [];
      const orderedRooms = applyRoomOrder(nextRooms, loadRoomOrder(user?.id));
      setRooms(orderedRooms);
      broadcastRoomUpdate(orderedRooms);
    } catch (err) {
      setError('Failed to load rooms. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [broadcastRoomUpdate, user?.id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const updateTouchMode = () => {
      setTouchOptimized(mediaQuery.matches || navigator.maxTouchPoints > 0);
    };

    updateTouchMode();
    mediaQuery.addEventListener?.('change', updateTouchMode);
    return () => mediaQuery.removeEventListener?.('change', updateTouchMode);
  }, []);

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
        const meetings = allEvents
          .filter(e => new Date(e.start_time) > now && e.category === 'meeting')
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
          .slice(0, 3); // Show max 3 upcoming meetings

        setUpcomingEvents(meetings);
      } catch {
        // silently fail
      }
    };

    fetchAllEvents();
  }, [rooms]);

  useLayoutEffect(() => {
    const nextPositions = new Map();

    if (touchOptimized) {
      previousPositionsRef.current = new Map();
      return;
    }

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
  }, [rooms, touchOptimized]);

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
      const nextRooms = upsertRoom(withoutTemp, room, { member_count: 1, my_role: 'owner' });
      broadcastRoomUpdate(nextRooms);
      return nextRooms;
    });
    setLoading(false);
  }, [broadcastRoomUpdate]);

  const handleCreateError = useCallback((tempRoomId) => {
    setRooms((prev) => prev.filter((item) => item.id !== tempRoomId));
  }, []);

  const handleRoomJoined = useCallback((room) => {
    setRooms((prev) => {
      const nextRooms = upsertRoom(prev, room, { member_count: 1, my_role: 'member' });
      broadcastRoomUpdate(nextRooms);
      return nextRooms;
    });
    setLoading(false);
  }, [broadcastRoomUpdate]);

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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 px-4 sm:px-6 md:px-8 py-8 sm:py-10 text-white shadow-xl">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-xl" />
          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                  Room hub
                </p>
                <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">Welcome back, {displayName}!</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
                  Create a fresh room, join with an invite code, and keep your latest study spaces within easy reach on web and Android.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 self-start lg:min-w-[240px]">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Rooms</p>
                  <p className="mt-2 text-2xl font-black">{rooms.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Meetings</p>
                  <p className="mt-2 text-2xl font-black">{upcomingEvents.length}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
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

        {/* Upcoming Meetings */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Upcoming Meetings</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                Next {upcomingEvents.length}
              </span>
            </div>
            {upcomingEvents.map((event) => {
              const startDate = new Date(event.start_time);
              const now = new Date();
              const diffMs = startDate - now;
              const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              const palette = getRoomPalette({ id: event.room_id, name: event.room_name });

              let timeText = formatDistanceToNow(startDate, { addSuffix: true });

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  style={{ borderLeftWidth: '4px', borderLeftColor: palette.accent }}
                  onClick={() => navigate(`/rooms/${event.room_id}`)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: palette.pillBg }}>
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      <span className="text-orange-600 font-bold mr-1.5">Meeting</span>
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span style={{ color: palette.pillText }} className="font-medium">{event.room_name}</span>
                      <span className="mx-1.5 text-muted-foreground/40">·</span>
                      {format(startDate, 'MMM d, h:mm a')}
                      <span className="mx-1.5 text-muted-foreground/40">·</span>
                      {timeText}
                    </p>
                  </div>
                  {diffDays <= 1 && (
                    <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                      {diffHours <= 1 ? 'SOON' : diffDays <= 0 ? 'TODAY' : 'TOMORROW'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">Your Rooms</h2>
          {!loading && <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">{rooms.length} total</span>}
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
                  if (touchOptimized) return;
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
                  draggableProps={touchOptimized ? {} : {
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

      </div>
    </MainLayout>
  );
}
