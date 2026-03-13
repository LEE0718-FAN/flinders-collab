import React, { useState, useEffect } from 'react';
import MainLayout from '@/layouts/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getReports, updateReport, getAdminUsers, toggleUserAdmin, deleteAdminUser } from '@/services/reports';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ChevronDown, Shield, ShieldOff, AlertCircle, User, ShieldAlert, Search, Trash2, Mail, GraduationCap, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];
const STATUS_FILTERS = ['all', 'open', 'in_progress', 'resolved', 'closed'];
const SECTION_FILTERS = ['all', 'overview', 'schedule', 'tasks', 'chat', 'files', 'login', 'signup'];

const statusColors = {
  open: 'bg-yellow-50 text-yellow-700 border-yellow-200/60',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200/60',
  resolved: 'bg-green-50 text-green-700 border-green-200/60',
  closed: 'bg-gray-50 text-gray-500 border-gray-200/60',
};

const sectionColors = {
  overview: 'bg-purple-50 text-purple-700',
  schedule: 'bg-orange-50 text-orange-700',
  tasks: 'bg-cyan-50 text-cyan-700',
  chat: 'bg-pink-50 text-pink-700',
  files: 'bg-emerald-50 text-emerald-700',
  login: 'bg-indigo-50 text-indigo-700',
  signup: 'bg-teal-50 text-teal-700',
};

function formatStatus(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchReports = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sectionFilter !== 'all') params.section = sectionFilter;
      const data = await getReports(params);
      setReports(Array.isArray(data) ? data : data.reports || []);
    } catch {
      // error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchReports();
  }, [statusFilter, sectionFilter]);

  const handleStatusChange = async (reportId, newStatus) => {
    setUpdatingId(reportId);
    try {
      await updateReport(reportId, { status: newStatus });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch {
      // error handled silently
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Status filter */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Status</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full h-8 text-xs capitalize ${
                statusFilter === s
                  ? 'bg-primary text-white'
                  : 'bg-white border-border/60 hover:bg-muted/50'
              }`}
              onClick={() => setStatusFilter(s)}
            >
              {formatStatus(s)}
            </Button>
          ))}
        </div>
      </div>

      {/* Section filter */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Section</span>
        <div className="flex flex-wrap gap-2">
          {SECTION_FILTERS.map((s) => (
            <Button
              key={s}
              variant={sectionFilter === s ? 'default' : 'outline'}
              size="sm"
              className={`rounded-full h-8 text-xs capitalize ${
                sectionFilter === s
                  ? 'bg-primary text-white'
                  : 'bg-white border-border/60 hover:bg-muted/50'
              }`}
              onClick={() => setSectionFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Report list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-sm">No reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="rounded-xl border-border/40 shadow-card hover:shadow-card-hover transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`rounded-full text-xs capitalize ${sectionColors[report.section] || ''}`}
                      >
                        {report.section}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`rounded-full text-xs ${statusColors[report.status] || ''}`}
                      >
                        {formatStatus(report.status)}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm">{report.subject}</h3>
                    <p className="text-sm text-muted-foreground/80 whitespace-pre-wrap">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                      <div className="h-5 w-5 rounded-full bg-muted/60 flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                      <span>{report.reporter?.full_name || report.reporter?.university_email || 'Unknown'}</span>
                      <span>&middot;</span>
                      <span>
                        {report.created_at
                          ? format(new Date(report.created_at), 'MMM d, yyyy h:mm a')
                          : 'Unknown date'}
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 gap-1 text-xs shrink-0"
                        disabled={updatingId === report.id}
                      >
                        {updatingId === report.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            {formatStatus(report.status)}
                            <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-lg">
                      {STATUS_OPTIONS.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => handleStatusChange(report.id, status)}
                          className="text-xs capitalize"
                        >
                          {formatStatus(status)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await getAdminUsers();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch {
      // error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleAdmin = async (userId) => {
    setTogglingId(userId);
    try {
      const result = await toggleUserAdmin(userId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_admin: result.is_admin ?? !u.is_admin } : u
        )
      );
    } catch {
      // error handled silently
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteAdminUser(confirmDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch {
      // error handled silently
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter users by search
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.university_email || '').toLowerCase().includes(q) ||
      (u.student_id || '').toLowerCase().includes(q) ||
      (u.major || '').toLowerCase().includes(q)
    );
  });

  const adminCount = users.filter((u) => u.is_admin).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="secondary" className="bg-muted/50 text-foreground rounded-full px-4 py-2 gap-1.5 text-sm font-medium">
          <User className="h-3.5 w-3.5" />
          {users.length} users
        </Badge>
        <Badge variant="default" className="bg-primary/10 text-primary rounded-full px-4 py-2 gap-1.5 text-sm font-medium">
          <Shield className="h-3.5 w-3.5" />
          {adminCount} admins
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="Search by name, email, student ID, or major..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 rounded-xl h-12 bg-white border-border/50 shadow-sm"
        />
      </div>

      {/* User list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <p className="text-sm">{search ? 'No users match your search' : 'No users found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const name = u.full_name || 'Unnamed';
            const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <Card key={u.id} className="rounded-xl border-border/40 shadow-card hover:shadow-card-hover transition-all">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px] truncate">{name}</span>
                      {u.is_admin && (
                        <Badge variant="default" className="rounded-full bg-primary/10 text-primary text-[10px] gap-1 border-0">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                      {u.university_email && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                          <Mail className="h-3 w-3" />
                          {u.university_email}
                        </span>
                      )}
                      {u.student_id && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                          <User className="h-3 w-3" />
                          {u.student_id}
                        </span>
                      )}
                      {u.major && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                          <GraduationCap className="h-3 w-3" />
                          {u.major}
                        </span>
                      )}
                      {u.created_at && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                          <Calendar className="h-3 w-3" />
                          Joined {format(new Date(u.created_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant={u.is_admin ? 'destructive' : 'outline'}
                      size="sm"
                      className="rounded-lg h-9 gap-1.5 text-xs"
                      onClick={() => handleToggleAdmin(u.id)}
                      disabled={togglingId === u.id}
                    >
                      {togglingId === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : u.is_admin ? (
                        <><ShieldOff className="h-3.5 w-3.5" />Remove Admin</>
                      ) : (
                        <><Shield className="h-3.5 w-3.5" />Make Admin</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmDelete({ id: u.id, name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete user confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This will remove the user from all rooms and delete their account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
            >
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : 'Yes, Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();

  if (!user?.is_admin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
          <p className="text-sm text-center max-w-sm">You do not have admin privileges to view this page.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage reports and user permissions
          </p>
        </div>

        <Tabs defaultValue="reports" className="mt-6">
          <TabsList>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
