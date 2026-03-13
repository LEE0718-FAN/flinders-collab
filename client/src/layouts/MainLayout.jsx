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

function NavItem({ to, isActive, icon: Icon, label }) {
  return (
    <Link to={to}>
      <button
        className={`
          group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth
          ${isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }
        `}
        role="link"
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 transition-smooth ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
        <span className="truncate">{label}</span>
        {isActive && (
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary/50" />
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
      <div className="mt-5 mb-1 flex items-center gap-2 px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Your Rooms
        </span>
        <div className="h-px flex-1 bg-border/60" />
        {rooms.length > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground/50">
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
          />
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="mx-3 mt-1 rounded-lg border border-dashed border-border/60 px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground/70">No rooms yet</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/50">Create or join a room to start</p>
        </div>
      )}

      {/* Admin - only visible to admins */}
      {isAdmin && (
        <>
          <div className="mt-5 mb-1 flex items-center gap-2 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Admin</span>
            <div className="h-px flex-1 bg-border/60" />
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

      if (Array.isArray(detail.rooms) && detail.rooms.length > 0) {
        setRooms(applyRoomOrder(detail.rooms, detail.orderedIds || loadRoomOrder(user?.id)));
        return;
      }

      setRooms((prev) => applyRoomOrder(prev, detail.orderedIds || loadRoomOrder(user?.id)));
    };

    const handleStorage = (event) => {
      const key = getRoomOrderKey(user?.id);
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
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/20 md:flex">
        {/* Sidebar header / brand */}
        <div className="flex h-14 items-center gap-2.5 border-b px-5 bg-primary">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-white flex items-center justify-center">
            <img
              src="/images/flinders-logo.png"
              alt="Flinders"
              className="h-full w-full object-contain"
              onError={(e) => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-primary-foreground">
            Flinders Collab
          </span>
        </div>

        {/* Sidebar navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <SidebarContent rooms={rooms} location={location} isAdmin={user?.is_admin} />
        </div>

        {/* Sidebar footer / user info */}
        <div className="border-t px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium leading-tight">{user?.user_metadata?.name || 'Student'}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b px-5 py-4 bg-primary">
                  <SheetTitle className="flex items-center gap-2.5 text-left">
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-white flex items-center justify-center">
                      <img
                        src="/images/flinders-logo.png"
                        alt="Flinders"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-[15px] font-bold tracking-tight text-primary-foreground">Flinders Collab</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 py-4">
                  <SidebarContent rooms={rooms} location={location} isAdmin={user?.is_admin} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold md:hidden">Flinders Collab</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2.5 rounded-full px-2 pr-3 hover:bg-muted" aria-label="User menu">
                <Avatar className="h-8 w-8 ring-2 ring-background">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.user_metadata?.name || 'Student'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLogoutOpen(true)} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar animate-fade-in">
          {children}
        </main>
      </div>

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
