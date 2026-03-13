import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Users, ChevronRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { getRooms } from '@/services/rooms';
import { applyRoomOrder, loadRoomOrder } from '@/lib/room-order';

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
  return (
    <Link to={to}>
      <button
        className={`
          group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 relative
          ${isActive && !palette
            ? 'bg-primary/[0.08] text-primary font-semibold'
            : isActive && palette
            ? 'font-semibold'
            : 'text-muted-foreground/80 hover:bg-muted/60 hover:text-foreground'
          }
        `}
        style={palette && isActive ? {
          background: palette.softBg,
          color: palette.text,
        } : undefined}
        role="link"
        aria-current={isActive ? 'page' : undefined}
      >
        {/* Active indicator bar */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full transition-all duration-300"
            style={{ backgroundColor: palette ? palette.icon : 'hsl(var(--primary))' }}
          />
        )}

        {palette && (
          <span
            className="h-2 w-2 shrink-0 rounded-full transition-all duration-200"
            style={{ backgroundColor: palette.icon, opacity: isActive ? 1 : 0.5 }}
          />
        )}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 transition-all duration-200 ${isActive && !palette ? 'text-primary' : !isActive ? 'text-muted-foreground/50 group-hover:text-foreground/70' : ''}`}
          style={palette && isActive ? { color: palette.icon } : undefined}
        />
        <span className="truncate">{label}</span>
        {isActive && (
          <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-30" style={{ color: palette?.icon || 'hsl(var(--primary))' }} />
        )}
      </button>
    </Link>
  );
}

function SidebarContent({ rooms, location, isAdmin }) {
  return (
    <nav className="flex flex-col gap-1" role="navigation" aria-label="Main navigation">
      <NavItem
        to="/dashboard"
        isActive={location.pathname === '/dashboard'}
        icon={LayoutDashboard}
        label="Dashboard"
      />

      {/* Room section divider */}
      <div className="mt-7 mb-2 px-3 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40">
          Your Rooms
        </span>
        <div className="h-px flex-1 bg-border/40" />
        {rooms.length > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground/30 bg-muted/50 px-1.5 py-0.5 rounded-md">
            {rooms.length}
          </span>
        )}
      </div>

      {/* Room list */}
      <div className="flex flex-col gap-0.5">
        {rooms.map((room) => (
          <NavItem
            key={room.id}
            to={`/rooms/${room.id}`}
            isActive={location.pathname === `/rooms/${room.id}`}
            icon={Users}
            label={room.name}
            palette={getRoomPalette(room)}
          />
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="mx-3 mt-2 rounded-xl border border-dashed border-border/30 px-4 py-5 text-center">
          <div className="mx-auto mb-2 h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
            <Users className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <p className="text-xs text-muted-foreground/50">No rooms yet</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/30">Create or join a room</p>
        </div>
      )}

      {/* Admin */}
      {isAdmin && (
        <>
          <div className="mt-7 mb-2 px-3 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40">Admin</span>
            <div className="h-px flex-1 bg-border/40" />
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

  useEffect(() => {
    getRooms()
      .then((data) => {
        const nextRooms = data.rooms || data || [];
        setRooms(applyRoomOrder(nextRooms, loadRoomOrder(user?.id)));
      })
      .catch(() => {});
  }, [location.pathname, user?.id]);

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

    window.addEventListener('room-order-updated', handleRoomOrderUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('room-order-updated', handleRoomOrderUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  const displayName = user?.user_metadata?.name || user?.email;

  return (
    <div className="flex h-screen bg-[#f8f9fc]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[260px] shrink-0 flex-col bg-white border-r border-border/30 md:flex">
        {/* Sidebar header / brand */}
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 shadow-sm shadow-blue-600/20 flex items-center justify-center">
            <img
              src="/images/flinders-logo.png"
              alt="Flinders"
              className="h-full w-full object-contain brightness-0 invert"
              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
          <div>
            <span className="text-[15px] font-bold tracking-tight text-foreground">
              Flinders Collab
            </span>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-border/50 via-border/30 to-transparent mx-3" />

        {/* Sidebar navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <SidebarContent rooms={rooms} location={location} isAdmin={user?.is_admin} />
        </div>

        {/* Sidebar footer / user info */}
        <div className="mx-3 mb-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
            <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-semibold leading-tight">{user?.user_metadata?.name || 'Student'}</p>
              <p className="truncate text-[11px] text-muted-foreground/60">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between bg-white/80 px-5 backdrop-blur-2xl border-b border-border/30">
          <div className="flex items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden rounded-xl" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 bg-white">
                <SheetHeader className="px-5 py-4 border-b border-border/30">
                  <SheetTitle className="flex items-center gap-3 text-left">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 shadow-sm flex items-center justify-center">
                      <img
                        src="/images/flinders-logo.png"
                        alt="Flinders"
                        className="h-full w-full object-contain brightness-0 invert"
                      />
                    </div>
                    <span className="text-[15px] font-bold tracking-tight text-foreground">Flinders Collab</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 py-4">
                  <SidebarContent rooms={rooms} location={location} isAdmin={user?.is_admin} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-[15px] font-bold md:hidden">Flinders Collab</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2.5 rounded-full px-2 pr-3.5 hover:bg-muted/50" aria-label="User menu">
                <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-[13px] font-medium sm:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl shadow-xl border-border/40 p-1.5">
              <div className="px-3 py-2.5">
                <p className="text-sm font-semibold">{user?.user_metadata?.name || 'Student'}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-border/30" />
              <DropdownMenuItem onClick={() => setLogoutOpen(true)} className="text-destructive focus:text-destructive rounded-lg mx-0.5">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar animate-fade-in">
          {children}
        </main>
      </div>

      {/* Logout confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your rooms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Yes, Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
