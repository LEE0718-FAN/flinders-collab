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
import { getReports, updateReport, getAdminUsers, toggleUserAdmin, deleteAdminUser, getMonitorStats, resolveAlert, triggerHealthCheck } from '@/services/reports';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2, ChevronDown, Shield, ShieldOff, AlertCircle, User, ShieldAlert, Search, Trash2, Mail, GraduationCap, Calendar,
  Activity, Server, Database, Clock, Zap, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Cpu, HardDrive, TrendingUp, Eye, Bell,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function MonitoringTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getMonitorStats();
      setStats(data);
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), 30000); // auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleHealthCheck = async () => {
    setCheckingHealth(true);
    try {
      await triggerHealthCheck();
      await fetchStats(true);
    } catch { /* silent */ } finally {
      setCheckingHealth(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      setStats((prev) => prev ? { ...prev, alerts: prev.alerts.filter((a) => a.id !== alertId) } : prev);
    } catch { /* silent */ }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!stats) {
    return <div className="text-center py-12 text-muted-foreground">Failed to load monitoring data</div>;
  }

  const memPercent = stats.memory ? ((stats.memory.heapUsed / stats.memory.heapTotal) * 100).toFixed(1) : 0;
  const isHealthy = stats.health?.supabase?.status === 'healthy';
  const hasAlerts = stats.alerts && stats.alerts.length > 0;

  return (
    <div className="space-y-5">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-slate-600">
            {isHealthy ? 'All systems operational' : 'Issues detected'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleHealthCheck} disabled={checkingHealth} className="h-8 gap-1.5 text-xs rounded-full">
            {checkingHealth ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
            Health Check
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchStats(true)} disabled={refreshing} className="h-8 gap-1.5 text-xs rounded-full">
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {hasAlerts && (
        <div className="space-y-2">
          {stats.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.severity === 'critical' ? <XCircle className="h-4 w-4 text-red-500 shrink-0" /> :
                 alert.severity === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> :
                 <Bell className="h-4 w-4 text-blue-500 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-slate-800">{alert.message}</p>
                  <p className="text-[11px] text-slate-500">
                    {alert.timestamp ? formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleResolveAlert(alert.id)} className="h-7 text-xs text-slate-500 hover:text-slate-800">
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-white/70" />
            <span className="text-xs text-white/70 font-medium">Uptime</span>
          </div>
          <p className="text-xl font-black">{formatUptime(stats.uptime)}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-white/70" />
            <span className="text-xs text-white/70 font-medium">Requests</span>
          </div>
          <p className="text-xl font-black">{stats.totalRequests?.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-white/70" />
            <span className="text-xs text-white/70 font-medium">Avg Response</span>
          </div>
          <p className="text-xl font-black">{Math.round(Number(stats.avgResponseTime) || 0)}<span className="text-sm font-normal">ms</span></p>
        </div>
        <div className={`rounded-xl p-4 text-white shadow-lg ${Number(stats.errorRate) > 5 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-white/70" />
            <span className="text-xs text-white/70 font-medium">Error Rate</span>
          </div>
          <p className="text-xl font-black">{Number(stats.errorRate || 0).toFixed(1)}<span className="text-sm font-normal">%</span></p>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Memory */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Memory Usage</span>
              </div>
              <span className={`text-sm font-bold ${memPercent > 80 ? 'text-red-600' : memPercent > 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {memPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${memPercent > 80 ? 'bg-red-500' : memPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(memPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-slate-400">
              <span>{formatBytes(stats.memory?.heapUsed || 0)} used</span>
              <span>{formatBytes(stats.memory?.heapTotal || 0)} total</span>
            </div>

            {/* Memory breakdown */}
            <div className="mt-4 space-y-1.5">
              {(() => {
                const mem = stats.memory || {};
                const rss = mem.rss || 0;
                const items = [
                  { label: 'Heap Used', value: mem.heapUsed || 0, color: 'bg-indigo-500' },
                  { label: 'Heap Free', value: (mem.heapTotal || 0) - (mem.heapUsed || 0), color: 'bg-slate-300' },
                  { label: 'External (C++)', value: mem.external || 0, color: 'bg-violet-500' },
                  { label: 'Array Buffers', value: mem.arrayBuffers || 0, color: 'bg-cyan-500' },
                ];
                return items.map(({ label, value, color }) => {
                  const pct = rss > 0 ? ((value / rss) * 100).toFixed(1) : 0;
                  return (
                    <div key={label} className="flex items-center gap-2 text-[11px]">
                      <div className={`h-2 w-2 rounded-full ${color} shrink-0`} />
                      <span className="text-slate-500 flex-1">{label}</span>
                      <span className="text-slate-600 font-medium w-16 text-right">{formatBytes(value)}</span>
                      <span className="text-slate-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                });
              })()}
              <div className="flex items-center gap-2 text-[11px] border-t border-slate-100 pt-1.5 mt-1.5">
                <div className="h-2 w-2 rounded-full bg-slate-700 shrink-0" />
                <span className="text-slate-600 font-semibold flex-1">RSS (Total)</span>
                <span className="text-slate-700 font-bold w-16 text-right">{formatBytes(stats.memory?.rss || 0)}</span>
                <span className="text-slate-500 font-medium w-10 text-right">100%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Health */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Database</span>
              </div>
              <Badge className={`rounded-full text-[10px] ${isHealthy ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                {isHealthy ? <><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</> : <><XCircle className="h-3 w-3 mr-1" />Down</>}
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Supabase</span>
                <span className={isHealthy ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                  {isHealthy ? 'Connected' : stats.health?.supabase?.error || 'Disconnected'}
                </span>
              </div>
              {stats.health?.lastCheck && (
                <div className="flex justify-between">
                  <span>Last checked</span>
                  <span>{formatDistanceToNow(new Date(stats.health.lastCheck), { addSuffix: true })}</span>
                </div>
              )}
              {stats.health?.supabase?.responseTime && (
                <div className="flex justify-between">
                  <span>Response time</span>
                  <span>{stats.health.supabase.responseTime}ms</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage (Pro Plan) */}
      {stats.storage && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Storage Usage (Pro)</span>
              </div>
              <Badge className="rounded-full text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
                {formatBytes(stats.storage.used)} / {formatBytes(stats.storage.total)}
              </Badge>
            </div>
            {(() => {
              const usedPct = stats.storage.total > 0 ? ((stats.storage.used / stats.storage.total) * 100) : 0;
              return (
                <>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${usedPct > 80 ? 'bg-red-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.max(usedPct, 0.5)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-slate-400">
                    <span>{usedPct.toFixed(2)}% used</span>
                    <span>{formatBytes(stats.storage.total - stats.storage.used)} free</span>
                  </div>
                </>
              );
            })()}
            {stats.storage.buckets && stats.storage.buckets.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Buckets</span>
                {stats.storage.buckets.map((b) => (
                  <div key={b.name} className="flex items-center gap-2 text-[11px]">
                    <div className="h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                    <span className="text-slate-600 flex-1">{b.name}</span>
                    <span className="text-slate-500 font-medium">{formatBytes(b.size)}</span>
                  </div>
                ))}
              </div>
            )}
            {stats.storage.lastCheck && (
              <p className="text-[10px] text-slate-400 mt-3">
                Last checked: {formatDistanceToNow(new Date(stats.storage.lastCheck), { addSuffix: true })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Error Log */}
      {stats.userErrors && stats.userErrors.length > 0 && (
        <Card className="shadow-sm border-orange-100">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              User Error Log
              <Badge className="rounded-full text-[10px] bg-orange-100 text-orange-700 border-orange-200">{stats.userErrors.length}</Badge>
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {stats.userErrors.map((err, i) => (
                <div key={i} className="rounded-lg bg-orange-50/50 border border-orange-100 px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] font-bold bg-orange-200 text-orange-700">
                          {(err.userName || '?').slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-slate-700">{err.userName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {err.timestamp ? formatDistanceToNow(new Date(err.timestamp), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-orange-800">
                    <span className="font-medium">{err.action}</span> 중 오류 발생
                    <span className="text-orange-500 ml-1">({err.statusCode})</span>
                  </p>
                  {err.errorMessage && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{err.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Codes + RPM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status Codes */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Server className="h-4 w-4 text-slate-500" />
              Response Status
            </h4>
            <div className="space-y-2">
              {[
                { key: '2xx', label: 'Success', color: 'bg-emerald-500' },
                { key: '3xx', label: 'Redirect', color: 'bg-blue-500' },
                { key: '4xx', label: 'Client Error', color: 'bg-amber-500' },
                { key: '5xx', label: 'Server Error', color: 'bg-red-500' },
              ].map(({ key, label, color }) => {
                const count = stats.statusCodes?.[key] || 0;
                const total = stats.totalRequests || 1;
                const pct = ((count / total) * 100).toFixed(1);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${color}`} />
                    <span className="text-xs text-slate-600 w-24">{label}</span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-500 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Requests Per Minute */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              Traffic (last 10 min)
            </h4>
            {stats.requestsPerMinute && stats.requestsPerMinute.length > 0 ? (
              <div className="flex items-end gap-1 h-20">
                {stats.requestsPerMinute.map((rpm, i) => {
                  const maxRpm = Math.max(...stats.requestsPerMinute.map((r) => r.count || 0), 1);
                  const height = ((rpm.count || 0) / maxRpm) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-indigo-500 to-blue-400 rounded-t transition-all duration-300"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${rpm.count || 0} req/min`}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No traffic data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      {stats.recentErrors && stats.recentErrors.length > 0 && (
        <Card className="shadow-sm border-red-100">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Recent Errors
              <Badge variant="destructive" className="rounded-full text-[10px]">{stats.recentErrors.length}</Badge>
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recentErrors.map((err, i) => (
                <div key={i} className="rounded-lg bg-red-50/50 border border-red-100 px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        {err.method} {err.path}
                      </code>
                      {err.userName && (
                        <span className="text-[10px] text-slate-500 font-medium">{err.userName}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {err.timestamp ? formatDistanceToNow(new Date(err.timestamp), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 font-medium">{err.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slow Requests */}
      {stats.slowRequests && stats.slowRequests.length > 0 && (
        <Card className="shadow-sm border-amber-100">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Slow Requests (&gt;2s)
              <Badge className="rounded-full text-[10px] bg-amber-100 text-amber-700 border-amber-200">{stats.slowRequests.length}</Badge>
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {stats.slowRequests.map((req, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <code className="text-slate-600 font-mono">{req.method} {req.path}</code>
                  <span className="text-amber-600 font-bold">{req.duration}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Activity Feed */}
      {stats.requestLog && stats.requestLog.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-500" />
              Recent Activity
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {stats.requestLog.slice(0, 30).map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] py-1 border-b border-slate-50 last:border-0">
                  <span className={`font-mono font-bold w-8 ${
                    req.status < 300 ? 'text-emerald-600' : req.status < 400 ? 'text-blue-600' : req.status < 500 ? 'text-amber-600' : 'text-red-600'
                  }`}>{req.status}</span>
                  <span className="text-slate-400 font-mono w-10">{req.method}</span>
                  <span className="text-slate-600 font-mono flex-1 truncate">{req.path}</span>
                  <span className="text-slate-400 w-12 text-right">{req.duration}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-slate-400 text-center">Auto-refreshes every 30 seconds</p>
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
              <p className="mt-1 text-slate-300 text-sm">Monitor, manage reports, and control users</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="monitoring">
          <TabsList className="bg-white rounded-2xl p-2 shadow-lg border">
            <TabsTrigger value="monitoring" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-500 gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-500">Reports</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-slate-500">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="mt-4">
            <MonitoringTab />
          </TabsContent>

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
