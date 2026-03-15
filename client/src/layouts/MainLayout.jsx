import React, { useState, useEffect } from 'react';
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
import { getRooms } from '@/services/rooms';
import { applyRoomOrder, loadRoomOrder } from '@/lib/room-order';

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

function NavItem({ to, isActive, icon: Icon, label, palette }) {
  const roomStyle = palette
    ? isActive
      ? { background: palette.icon + '22' }
      : undefined
    : undefined;

  const activeAccentColor = palette ? palette.icon : '#818cf8';

  return (
    <Link to={to}>
      <button
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
        <span className="truncate">{label}</span>
        {isActive && (
          <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40 text-slate-400" />
        )}
      </button>
    </Link>
  );
}

function SidebarContent({ rooms, location, isAdmin, unreadCounts = {} }) {
  return (
    <nav className="flex flex-col gap-1" role="navigation" aria-label="Main navigation" data-tour="sidebar-nav">
      <NavItem
        to="/dashboard"
        isActive={location.pathname === '/dashboard'}
        icon={LayoutDashboard}
        label="Dashboard"
      />
      <NavItem
        to="/deadlines"
        isActive={location.pathname === '/deadlines'}
        icon={CalendarClock}
        label="Deadlines"
      />
      <NavItem
        to="/board"
        isActive={location.pathname === '/board'}
        icon={MessageSquare}
        label="Free Board"
      />
      <NavItem
        to="/flinders-life"
        isActive={location.pathname === '/flinders-life'}
        icon={GraduationCap}
        label="Flinders Life"
      />

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
          const unread = unreadCounts[room.id] || 0;
          return (
            <div key={room.id} className="relative">
              <NavItem
                to={`/rooms/${room.id}`}
                isActive={location.pathname === `/rooms/${room.id}`}
                icon={Users}
                label={room.name}
                palette={getRoomPalette(room)}
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
          <NavItem to="/admin" isActive={location.pathname === '/admin'} icon={Shield} label="Admin Panel" />
        </>
      )}
    </nav>
  );
}

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [maintenance, setMaintenance] = useState(null); // { type, message, minutesUntil }
  const [unreadCounts, setUnreadCounts] = useState({});

  const refreshRooms = async () => {
    const data = await getRooms();
    const nextRooms = data.rooms || data || [];
    setRooms(applyRoomOrder(nextRooms, loadRoomOrder(user?.id)));
  };

  useEffect(() => {
    refreshRooms().catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const handleRoomOrderUpdated = (event) => {
      const detail = event.detail || {};
      if (detail.userId && detail.userId !== user?.id) {
        return;
      }

      const nextOrder = detail.orderedIds || loadRoomOrder(user?.id);
      setRooms((prev) => applyRoomOrder(prev, nextOrder));
    };

    const handleStorage = (event) => {
      const key = user?.id ? `room-order:${user.id}` : null;
      if (!key || event.key !== key) {
        return;
      }

      setRooms((prev) => applyRoomOrder(prev, loadRoomOrder(user?.id)));
    };

    const handleRoomsUpdated = (event) => {
      const detail = event.detail || {};
      if (detail.userId && detail.userId !== user?.id) {
        return;
      }

      if (Array.isArray(detail.rooms)) {
        setRooms(applyRoomOrder(detail.rooms, loadRoomOrder(user?.id)));
        return;
      }

      refreshRooms().catch(() => {});
    };

    // Debounce window focus to avoid excessive refetches (min 30s between)
    let lastFocusRefresh = 0;
    const handleWindowFocus = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastFocusRefresh < 30000) return;
      lastFocusRefresh = now;
      refreshRooms().catch(() => {});
    };

    window.addEventListener('room-order-updated', handleRoomOrderUpdated);
    window.addEventListener('storage', handleStorage);
    window.addEventListener(ROOM_NAVIGATION_UPDATED_EVENT, handleRoomsUpdated);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleWindowFocus);

    return () => {
      window.removeEventListener('room-order-updated', handleRoomOrderUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ROOM_NAVIGATION_UPDATED_EVENT, handleRoomsUpdated);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleWindowFocus);
    };
  }, [user?.id]);

  // Fetch unread announcement counts for sidebar badges
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const { getUnreadCounts } = await import('@/services/announcements');
        const counts = await getUnreadCounts();
        setUnreadCounts(counts || {});
      } catch { /* silent */ }
    };
    fetchUnreadCounts();

    const handleAnnouncementsRead = (e) => {
      const { roomId } = e.detail || {};
      if (roomId) {
        setUnreadCounts(prev => {
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
        message: `DB 최적화가 ${data.minutesUntil}분 후 진행됩니다 (약 ${data.estimatedDuration})`,
      });
    };
    const onStarted = () => {
      setMaintenance({
        type: 'started',
        message: 'DB 최적화 진행 중...',
      });
    };
    const onDone = (data) => {
      setMaintenance({
        type: 'done',
        message: `DB 최적화 완료 (${(data.duration / 1000).toFixed(1)}초)`,
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
          <SidebarContent rooms={rooms} location={location} isAdmin={user?.is_admin} unreadCounts={unreadCounts} />
        </div>

        {/* Sidebar footer / user info */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-3 py-3">
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
                  <SidebarContent rooms={rooms} location={location} isAdmin={user?.is_admin} unreadCounts={unreadCounts} />
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
