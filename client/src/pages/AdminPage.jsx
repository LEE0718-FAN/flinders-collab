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
  open: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
};

const sectionColors = {
  overview: 'bg-purple-100 text-purple-800',
  schedule: 'bg-orange-100 text-orange-800',
  tasks: 'bg-cyan-100 text-cyan-800',
  chat: 'bg-pink-100 text-pink-800',
  files: 'bg-emerald-100 text-emerald-800',
  login: 'bg-indigo-100 text-indigo-800',
  signup: 'bg-teal-100 text-teal-800',
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
    <div className="space-y-4">
      {/* Status filter */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className={`h-7 text-xs capitalize rounded-full ${statusFilter === s ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-0' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}
              onClick={() => setStatusFilter(s)}
            >
              {formatStatus(s)}
            </Button>
          ))}
        </div>
      </div>

      {/* Section filter */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Section</span>
        <div className="flex flex-wrap gap-1.5">
          {SECTION_FILTERS.map((s) => (
            <Button
              key={s}
              variant={sectionFilter === s ? 'default' : 'outline'}
              size="sm"
              className={`h-7 text-xs capitalize rounded-full ${sectionFilter === s ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-0' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}
              onClick={() => setSectionFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Report list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">No reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const borderColor = report.status === 'open' ? 'border-l-4 border-l-amber-400' : report.status === 'in_progress' ? 'border-l-4 border-l-blue-400' : report.status === 'resolved' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-slate-300';
            return (
            <Card key={report.id} className={`shadow-sm hover:shadow-md transition-shadow ${borderColor}`}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs capitalize ${sectionColors[report.section] || ''}`}
                      >
                        {report.section}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[report.status] || ''}`}
                      >
                        {formatStatus(report.status)}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm">{report.subject}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
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
                        className="h-8 gap-1 text-xs shrink-0"
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
                    <DropdownMenuContent align="end">
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
            );
          })}
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
      <div className="flex justify-center py-12">
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
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{users.length}</p>
              <p className="text-xs text-white/70">Total Users</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{adminCount}</p>
              <p className="text-xs text-white/70">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, student ID, or major..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* User list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <User className="h-8 w-8" />
          <p className="text-sm">{search ? 'No users match your search' : 'No users found'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const name = u.full_name || 'Unnamed';
            const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <Card key={u.id} className="shadow-sm hover:shadow-md transition-all">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{name}</span>
                      {u.is_admin && (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                      {u.university_email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {u.university_email}
                        </span>
                      )}
                      {u.student_id && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {u.student_id}
                        </span>
                      )}
                      {u.major && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <GraduationCap className="h-3 w-3" />
                          {u.major}
                        </span>
                      )}
                      {u.created_at && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
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
                      className="h-8 gap-1.5 text-xs"
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
                      className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
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
        <div className="flex items-center justify-center py-20">
          <div className="bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 rounded-2xl p-12 shadow-lg flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg">
              <ShieldAlert className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground">You do not have admin privileges to view this page.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-8 py-8 text-white shadow-xl">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/20 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Admin Panel</h1>
              <p className="mt-1 text-slate-300 text-sm">Manage reports and user permissions</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="bg-white rounded-2xl p-2 shadow-lg border">
            <TabsTrigger value="reports" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-500">Reports</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-500">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-4">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
