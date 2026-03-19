import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Users, ChevronRight, Shield, User, CalendarClock, MessageSquare, Wrench, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { socket } from '@/lib/socket';
import ProfileDialog from '@/components/ProfileDialog';
import { useToast } from '@/components/ui/toast';

import { getRoomActivitySummary, getRooms } from '@/services/rooms';
import { getUpcomingEventCount } from '@/services/events';
import { getBoardNotifications, updateBoardState } from '@/services/board';
import { applyRoomOrder } from '@/lib/room-order';
import { getLatestBoardTimestamp } from '@/lib/board-notifications';
import { getCachedPreferences, hydratePreferences } from '@/lib/preferences';
import { preloadRoute } from '@/lib/route-preload';

const ROOM_NAVIGATION_UPDATED_EVENT = 'rooms-updated';

const roomPalettes = [
  { softBg: '#fff1f6', softBorder: '#fbcfe8', text: '#831843', icon: '#9d174d' },
  { softBg: '#f0f9ff', softBorder: '#bae6fd', text: '#0c4a6e', icon: '#075985' },
  { softBg: '#f0fdf4', softBorder: '#bbf7d0', text: '#14532d', icon: '#166534' },
  { softBg: '#fffbeb', softBorder: '#fde68a', text: '#78350f', icon: '#92400e' },
  { softBg: '#f5f3ff', softBorder: '#ddd6fe', text: '#4c1d95', icon: '#5b21b6' },
  { softBg: '#f0fdfa', softBorder: '#ccfbf1', text: '#134e4a', icon: '#0f766e' },
];

function getRoomPalette(room) {
  const seed = `${room.id || ''}-${room.name || ''}`;
  const hash = [...seed].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) % roomPalettes.length, 0);
  return roomPalettes[Math.abs(hash) % roomPalettes.length];
}

function NavItem({ to, isActive, icon: Icon, label, palette, badgeCount = 0, badgeLabel = '', onIntent }) {
  const roomStyle = palette
    ? isActive
      ? { background: palette.icon + '22' }
      : undefined
    : undefined;

  const activeAccentColor = palette ? palette.icon : '#818cf8';
  const hasBadge = Boolean(badgeLabel) || badgeCount > 0;

  return (
    <Link to={to}>
      <button
        onMouseEnter={onIntent}
        onFocus={onIntent}
        onTouchStart={onIntent}
        className={`
          group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth
          ${isActive
            ? 'bg-white/15 text-white font-semibold'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
          }
        `}
        style={roomStyle}
        role="link"
        aria-current={isActive ? 'page' : undefined}
      >
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ backgroundColor: activeAccentColor }}
          />
        )}
        {palette && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: palette.icon,
              boxShadow: isActive ? `0 0 8px ${palette.icon}88` : undefined,
            }}
          />
        )}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 transition-smooth ${
            isActive
              ? palette ? 'text-white' : 'text-indigo-400'
              : 'text-slate-500 group-hover:text-slate-300'
          }`}
        />
        <span className="min-w-0 flex flex-1 items-center gap-2">
          <span className="min-w-0 truncate">{label}</span>
          {hasBadge && (
            <span className="inline-flex h-5 min-w-5 max-w-[5.5rem] items-center justify-center rounded-full bg-rose-500 px-2 text-[10px] font-bold tabular-nums text-white shadow-sm whitespace-nowrap">
              {badgeLabel || (badgeCount > 99 ? '99+' : badgeCount)}
            </span>
          )}
        </span>
        <ChevronRight className={`ml-2 h-3.5 w-3.5 shrink-0 text-slate-400 transition-opacity ${isActive ? 'opacity-40' : 'opacity-0'}`} />
      </button>
    </Link>
  );
}

function SidebarContent({ rooms, location, isAdmin, roomBadgeCounts = {}, user, deadlineCount = 0, boardUnreadCount = 0 }) {
  return (
    <nav className="flex flex-col gap-1" role="navigation" aria-label="Main navigation" data-tour="sidebar-nav">
      <NavItem
        to="/dashboard"
        isActive={location.pathname === '/dashboard'}
        icon={LayoutDashboard}
        label="Dashboard"
        onIntent={() => preloadRoute('/dashboard')}
      />
      <NavItem
        to="/deadlines"
        isActive={location.pathname === '/deadlines'}
        icon={CalendarClock}
        label="Deadlines"
        badgeCount={deadlineCount}
        onIntent={() => preloadRoute('/deadlines')}
      />
      <NavItem
        to="/board"
        isActive={location.pathname === '/board'}
        icon={MessageSquare}
        label="Free Board"
        badgeCount={boardUnreadCount}
        onIntent={() => preloadRoute('/board')}
      />
      {(user?.account_type || user?.user_metadata?.account_type || 'flinders') !== 'general' && (
        <NavItem
          to="/flinders-life"
          isActive={location.pathname === '/flinders-life'}
          icon={GraduationCap}
          label="Flinders Life"
          onIntent={() => preloadRoute('/flinders-life')}
        />
      )}

      {/* Room section divider */}
      <div className="mt-5 mb-1 flex items-center gap-2 px-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          Your Rooms
        </span>
        <div className="h-px flex-1 bg-white/5" />
        {rooms.length > 0 && (
          <span className="text-[10px] tabular-nums text-slate-500 bg-white/10 px-1.5 py-0.5 rounded-md">
            {rooms.length}
          </span>
        )}
      </div>

      {/* Room list */}
      <div className="flex flex-col gap-0.5" data-tour="sidebar-rooms">
        {rooms.map((room) => {
          const unread = roomBadgeCounts[room.id] || 0;
          return (
            <div key={room.id} className="relative">
              <NavItem
                to={`/rooms/${room.id}`}
                isActive={location.pathname === `/rooms/${room.id}`}
                icon={Users}
                label={room.name}
                palette={getRoomPalette(room)}
                onIntent={() => preloadRoute(`/rooms/${room.id}`)}
              />
              {unread > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                  {unread}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <div className="mx-3 mt-1 rounded-lg border border-dashed border-white/10 px-4 py-5 text-center">
          <Users className="mx-auto h-5 w-5 text-slate-500 mb-1.5 opacity-50" />
          <p className="text-xs text-slate-400">No rooms yet</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Create or join a room to start</p>
        </div>
      )}

      {/* Admin - only visible to admins */}
      {isAdmin && (
        <>
          <div className="mt-5 mb-1 flex items-center gap-2 px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Admin</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <NavItem to="/admin" isActive={location.pathname === '/admin'} icon={Shield} label="Admin Panel" onIntent={() => preloadRoute('/admin')} />
        </>
      )}
    </nav>
  );
}

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const { addToast, removeToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [maintenance, setMaintenance] = useState(null); // { type, message, minutesUntil }
  const [announcementUnreadCounts, setAnnouncementUnreadCounts] = useState({});
  const [recentActivityCounts, setRecentActivityCounts] = useState({});
  const [deadlineCount, setDeadlineCount] = useState(0);
  const [boardUnreadCount, setBoardUnreadCount] = useState(0);
  const [roomLastVisitedMap, setRoomLastVisitedMap] = useState({});
  const [roomOrderIds, setRoomOrderIds] = useState([]);
  const boardToastIdsRef = useRef(new Set());
  const boardLastSeenAtRef = useRef(0);

  const syncRoomVisitState = useCallback((roomList = []) => {
    setRoomLastVisitedMap((prev) => {
      const next = { ...prev };
      roomList.forEach((room) => {
        const timestamp = room?.last_visited_at ? new Date(room.last_visited_at).getTime() : 0;
        next[room.id] = Number.isFinite(timestamp) ? timestamp : 0;
      });
      return next;
    });
  }, []);

  const refreshRooms = async () => {
    const data = await getRooms();
    const nextRooms = data.rooms || data || [];
    syncRoomVisitState(nextRooms);
    setRooms(applyRoomOrder(nextRooms, roomOrderIds));
  };

  const refreshDeadlineCount = async () => {
    try {
      const data = await getUpcomingEventCount();
      setDeadlineCount(Number(data?.count || 0));
    } catch {
      setDeadlineCount(0);
    }
  };

  const refreshRecentActivityCounts = useCallback(async (targetRooms = rooms) => {
    if (!user?.id) {
      setRecentActivityCounts({});
      return;
    }

    try {
      const summary = await getRoomActivitySummary();
      const next = {};
      targetRooms.forEach((room) => {
        const count = Number(summary?.[room.id] || 0);
        if (count > 0) next[room.id] = count;
      });
      setRecentActivityCounts(next);
    } catch {
      setRecentActivityCounts({});
    }
  }, [rooms, user?.id]);

  const roomBadgeCounts = useMemo(() => {
    const next = {};
    const roomIds = new Set([
      ...Object.keys(announcementUnreadCounts || {}),
      ...Object.keys(recentActivityCounts || {}),
    ]);

    roomIds.forEach((roomId) => {
      const count = (announcementUnreadCounts[roomId] || 0) + (recentActivityCounts[roomId] || 0);
      if (count > 0) next[roomId] = count;
    });

    return next;
  }, [announcementUnreadCounts, recentActivityCounts]);

  const clearBoardToasts = useCallback(() => {
    boardToastIdsRef.current.forEach((toastId) => removeToast(toastId));
    boardToastIdsRef.current.clear();
  }, [removeToast]);

  const markBoardSeen = useCallback(async (posts = []) => {
    if (!user?.id) return;

    const latestTimestamp = getLatestBoardTimestamp(posts);
    const safeTimestamp = latestTimestamp || Date.now();
    await updateBoardState(new Date(safeTimestamp).toISOString());
    boardLastSeenAtRef.current = safeTimestamp;
    setBoardUnreadCount(0);
    clearBoardToasts();
    window.dispatchEvent(new CustomEvent('board-notifications-read', {
      detail: { userId: user.id, timestamp: safeTimestamp },
    }));
  }, [clearBoardToasts, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const hydrateInitialState = async () => {
      const preferences = await hydratePreferences().catch(() => getCachedPreferences());
      if (cancelled) return;
      const orderedIds = Array.isArray(preferences?.room_order) ? preferences.room_order : [];
      setRoomOrderIds(orderedIds);

      const data = await getRooms();
      if (cancelled) return;
      const nextRooms = data.rooms || data || [];
      syncRoomVisitState(nextRooms);
      setRooms(applyRoomOrder(nextRooms, orderedIds));

      refreshDeadlineCount().catch(() => {});
    };

    hydrateInitialState().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [refreshDeadlineCount, syncRoomVisitState, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setBoardUnreadCount(0);
      boardLastSeenAtRef.current = 0;
      clearBoardToasts();
      return;
    }

    let cancelled = false;

    const syncBoardNotifications = async ({ suppressToast = false } = {}) => {
      try {
        const data = await getBoardNotifications();
        if (cancelled) return;

        const posts = Array.isArray(data?.posts) ? data.posts : [];
        const latestTimestamp = getLatestBoardTimestamp(posts);
        const lastSeen = data?.last_seen_at ? new Date(data.last_seen_at).getTime() : boardLastSeenAtRef.current;
        boardLastSeenAtRef.current = Number.isFinite(lastSeen) ? lastSeen : 0;

        if (!lastSeen) {
          if (latestTimestamp > 0) {
            await markBoardSeen(posts);
          }
          setBoardUnreadCount(0);
          return;
        }

        if (location.pathname === '/board') {
          await markBoardSeen(posts);
          return;
        }

        const unreadCount = Number(data?.unread_count || 0);
        setBoardUnreadCount(unreadCount);

        if (suppressToast || unreadCount === 0 || posts.length === 0) return;

        posts
          .reverse()
          .forEach((post) => {
            const authorName = post?.is_anonymous ? 'Anonymous' : (post?.users?.full_name || 'Someone');
            const toastId = addToast({
              key: `board-post:${post.id}`,
              title: `${authorName} posted on Free Board`,
              message: post?.title || 'New Free Board post',
              type: 'info',
              duration: 8000,
              actionLabel: 'View',
              onAction: () => {
                markBoardSeen(posts);
                navigate('/board');
              },
              onClick: () => {
                markBoardSeen(posts);
                navigate('/board');
              },
            });

            if (toastId) {
              boardToastIdsRef.current.add(toastId);
            }
          });
      } catch {
        if (!cancelled) {
          setBoardUnreadCount(0);
        }
      }
    };

    syncBoardNotifications({ suppressToast: true }).catch(() => {
      if (!cancelled) {
        boardLastSeenAtRef.current = 0;
        setBoardUnreadCount(0);
      }
    });

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      syncBoardNotifications().catch(() => {});
    }, 15000);

    const handleBoardRead = (event) => {
      if (event.detail?.userId && event.detail.userId !== user.id) return;
      const timestamp = Number(event.detail?.timestamp || 0);
      if (Number.isFinite(timestamp) && timestamp > 0) {
        boardLastSeenAtRef.current = timestamp;
      }
      setBoardUnreadCount(0);
      clearBoardToasts();
    };

    const handleBoardRefresh = () => {
      syncBoardNotifications().catch(() => {});
    };

    const handleFocus = () => {
      if (document.visibilityState === 'hidden') return;
      syncBoardNotifications().catch(() => {});
    };

    window.addEventListener('board-notifications-read', handleBoardRead);
    window.addEventListener('board-post-created', handleBoardRefresh);
    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('board-notifications-read', handleBoardRead);
      window.removeEventListener('board-post-created', handleBoardRefresh);
      window.removeEventListener('focus', handleFocus);
      clearBoardToasts();
    };
  }, [addToast, clearBoardToasts, location.pathname, markBoardSeen, navigate, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setRecentActivityCounts({});
      return;
    }
    if (rooms.length === 0) {
      setRecentActivityCounts({});
      return;
    }
    refreshRecentActivityCounts(rooms).catch(() => {});
  }, [rooms, user?.id]);

  useEffect(() => {
    const handleRoomOrderUpdated = (event) => {
      const detail = event.detail || {};
      if (detail.userId && detail.userId !== user?.id) {
        return;
      }

      const nextOrder = Array.isArray(detail.orderedIds) ? detail.orderedIds : roomOrderIds;
      setRoomOrderIds(nextOrder);
      setRooms((prev) => applyRoomOrder(prev, nextOrder));
    };

    const handleRoomsUpdated = (event) => {
      const detail = event.detail || {};
      if (detail.userId && detail.userId !== user?.id) {
        return;
      }

      if (Array.isArray(detail.rooms)) {
        syncRoomVisitState(detail.rooms);
        const orderedIds = Array.isArray(detail.orderedIds) ? detail.orderedIds : roomOrderIds;
        setRoomOrderIds(orderedIds);
        setRooms(applyRoomOrder(detail.rooms, orderedIds));
        refreshDeadlineCount().catch(() => {});
        refreshRecentActivityCounts(detail.rooms).catch(() => {});
        return;
      }

      refreshRooms().catch(() => {});
      refreshDeadlineCount().catch(() => {});
      refreshRecentActivityCounts().catch(() => {});
    };

    // Debounce window focus to avoid excessive refetches (min 30s between)
    let lastFocusRefresh = 0;
    const handleWindowFocus = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastFocusRefresh < 30000) return;
      lastFocusRefresh = now;
      refreshRooms().catch(() => {});
      refreshDeadlineCount().catch(() => {});
      refreshRecentActivityCounts().catch(() => {});
    };

    const handleRoomActivityVisited = (event) => {
      const { roomId, timestamp } = event.detail || {};
      if (!roomId) return;
      const safeTimestamp = Number(timestamp || Date.now());
      setRoomLastVisitedMap((prev) => ({ ...prev, [roomId]: safeTimestamp }));
      setRecentActivityCounts((prev) => {
        if (!(roomId in prev)) return prev;
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
    };

    window.addEventListener('room-order-updated', handleRoomOrderUpdated);
    window.addEventListener(ROOM_NAVIGATION_UPDATED_EVENT, handleRoomsUpdated);
    window.addEventListener('room-activity-visited', handleRoomActivityVisited);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      window.removeEventListener('room-order-updated', handleRoomOrderUpdated);
      window.removeEventListener(ROOM_NAVIGATION_UPDATED_EVENT, handleRoomsUpdated);
      window.removeEventListener('room-activity-visited', handleRoomActivityVisited);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, [refreshDeadlineCount, refreshRecentActivityCounts, roomOrderIds, syncRoomVisitState, user?.id]);

  // Fetch unread announcement counts for sidebar badges
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const { getUnreadCounts } = await import('@/services/announcements');
        const counts = await getUnreadCounts();
        setAnnouncementUnreadCounts(counts || {});
      } catch { /* silent */ }
    };
    fetchUnreadCounts();

    const handleAnnouncementsRead = (e) => {
      const { roomId } = e.detail || {};
      if (roomId) {
        setAnnouncementUnreadCounts(prev => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
      }
    };
    window.addEventListener('announcements-read', handleAnnouncementsRead);
    return () => window.removeEventListener('announcements-read', handleAnnouncementsRead);
  }, []);

  // Listen for maintenance notifications via Socket.IO
  useEffect(() => {
    const onUpcoming = (data) => {
      setMaintenance({
        type: 'upcoming',
        message: `DB optimization in ${data.minutesUntil} min (est. ${data.estimatedDuration})`,
      });
    };
    const onStarted = () => {
      setMaintenance({
        type: 'started',
        message: 'DB optimization in progress...',
      });
    };
    const onDone = (data) => {
      setMaintenance({
        type: 'done',
        message: `DB optimization complete (${(data.duration / 1000).toFixed(1)}s)`,
      });
      setTimeout(() => setMaintenance(null), 10000);
    };

    socket.on('maintenance:upcoming', onUpcoming);
    socket.on('maintenance:started', onStarted);
    socket.on('maintenance:done', onDone);

    return () => {
      socket.off('maintenance:upcoming', onUpcoming);
      socket.off('maintenance:started', onStarted);
      socket.off('maintenance:done', onDone);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const displayName = user?.user_metadata?.name || user?.email;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 md:flex">
        {/* Sidebar header / brand */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white p-1 shadow-lg flex items-center justify-center">
            <img
              src="/images/flinders-logo.png"
              alt="Flinders"
              className="h-full w-full object-contain"
              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">
            Flinders Collab
          </span>
        </div>
        <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mx-3" />

        {/* Sidebar navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <SidebarContent rooms={rooms} location={location} isAdmin={user?.is_admin} roomBadgeCounts={roomBadgeCounts} user={user} deadlineCount={deadlineCount} boardUnreadCount={boardUnreadCount} />
        </div>

        {/* Sidebar footer / user info */}
        <div className="mt-auto border-t border-white/5 bg-gradient-to-t from-indigo-950 via-slate-900 to-slate-900/95 px-3 py-3 backdrop-blur">
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-3 shadow-inner shadow-black/10">
            <Avatar className="h-8 w-8 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20">
              {user?.user_metadata?.avatar_url && (
                <AvatarImage src={user.user_metadata.avatar_url} alt="Profile" className="object-cover" />
              )}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-semibold leading-tight text-white">{user?.user_metadata?.name || 'Student'}</p>
              <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between gap-3 border-b-2 border-slate-200 bg-white/90 px-3 backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-72 border-r-0 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 p-0">
                <SheetHeader className="px-5 py-4">
                  <SheetTitle className="flex items-center gap-2.5 text-left">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white p-1 shadow-lg flex items-center justify-center">
                      <img
                        src="/images/flinders-logo.png"
                        alt="Flinders"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-[15px] font-bold tracking-tight text-white">Flinders Collab</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent mx-3" />
                <div className="px-3 py-4">
                  <SidebarContent rooms={rooms} location={location} isAdmin={user?.is_admin} roomBadgeCounts={roomBadgeCounts} user={user} deadlineCount={deadlineCount} boardUnreadCount={boardUnreadCount} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 md:hidden">
              <span className="block truncate text-sm font-semibold">Flinders Collab</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {location.pathname === '/dashboard' ? 'Dashboard' : displayName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
          {/* Maintenance notification */}
          {maintenance && (
            <div className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium animate-fade-in ${
              maintenance.type === 'upcoming' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              maintenance.type === 'started' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <Wrench className={`h-3.5 w-3.5 ${maintenance.type === 'started' ? 'animate-spin' : ''}`} />
              <span>{maintenance.message}</span>
              {maintenance.type !== 'started' && (
                <button onClick={() => setMaintenance(null)} className="ml-1 text-current opacity-50 hover:opacity-100">&times;</button>
              )}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 rounded-full px-2 sm:gap-2.5 sm:pr-3 hover:bg-muted" aria-label="User menu" data-tour="user-menu">
                <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                  {user?.user_metadata?.avatar_url && (
                    <AvatarImage src={user.user_metadata.avatar_url} alt="Profile" className="object-cover" />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[160px] truncate text-sm font-medium sm:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl shadow-xl border-border/40 p-1.5">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.user_metadata?.name || 'Student'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLogoutOpen(true)} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        {/* Mobile maintenance notification */}
        {maintenance && (
          <div className={`sm:hidden flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium ${
            maintenance.type === 'upcoming' ? 'bg-amber-50 text-amber-700' :
            maintenance.type === 'started' ? 'bg-blue-50 text-blue-700' :
            'bg-green-50 text-green-700'
          }`}>
            <div className="flex items-center gap-2">
              <Wrench className={`h-3.5 w-3.5 shrink-0 ${maintenance.type === 'started' ? 'animate-spin' : ''}`} />
              <span>{maintenance.message}</span>
            </div>
            {maintenance.type !== 'started' && (
              <button onClick={() => setMaintenance(null)} className="text-current opacity-50 hover:opacity-100 shrink-0">&times;</button>
            )}
          </div>
        )}

        {/* Main Content */}
        <main
          data-main-scroll-container="true"
          className="relative flex-1 overflow-y-auto bg-slate-50 p-3 pb-6 sm:p-4 md:p-6 custom-scrollbar animate-fade-in"
          style={{
            paddingTop: 'max(0.75rem, var(--safe-top))',
            paddingBottom: 'max(1.5rem, var(--safe-bottom))',
            paddingLeft: 'max(0.75rem, var(--safe-left))',
            paddingRight: 'max(0.75rem, var(--safe-right))',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(59,130,246,0.06) 0%, transparent 50%)',
            }}
          />
          <div className="relative">
            {children}
          </div>
        </main>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

      {/* Logout confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your rooms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
