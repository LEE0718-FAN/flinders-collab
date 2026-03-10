import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { getRooms } from '@/services/rooms';

function SidebarContent({ rooms, location }) {
  return (
    <nav className="flex flex-col gap-1">
      <Link to="/dashboard">
        <Button variant={location.pathname === '/dashboard' ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <div className="mt-4 px-2">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Your Rooms</p>
      </div>
      {rooms.map((room) => (
        <Link key={room.id} to={`/rooms/${room.id}`}>
          <Button variant={location.pathname === `/rooms/${room.id}` ? 'secondary' : 'ghost'} className="w-full justify-start gap-2">
            <Users className="h-4 w-4" />
            <span className="truncate">{room.name}</span>
          </Button>
        </Link>
      ))}
      {rooms.length === 0 && (
        <p className="px-2 text-sm text-muted-foreground">No rooms yet</p>
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

  useEffect(() => {
    getRooms()
      .then((data) => setRooms(data.rooms || data || []))
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-muted/30 p-4 md:block">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-primary">Flinders Collab</h2>
        </div>
        <SidebarContent rooms={rooms} location={location} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Flinders Collab</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <SidebarContent rooms={rooms} location={location} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium md:hidden">Flinders Collab</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">{user?.user_metadata?.name || user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-xs text-muted-foreground">{user?.email}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
