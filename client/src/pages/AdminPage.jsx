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
import { getReports, updateReport, getAdminUsers, toggleUserAdmin } from '@/services/reports';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ChevronDown, Shield, ShieldOff, AlertCircle, User, ShieldAlert } from 'lucide-react';
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
              className="h-7 text-xs capitalize"
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
              className="h-7 text-xs capitalize"
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
          {reports.map((report) => (
            <Card key={report.id}>
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
                      <span>{report.reporter_name || report.reporter_email || 'Unknown'}</span>
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

  useEffect(() => {
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
    fetchUsers();
  }, []);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <User className="h-8 w-8" />
        <p className="text-sm">No users found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <Card key={u.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{u.name || 'Unnamed'}</span>
                {u.is_admin && (
                  <Badge variant="default" className="text-[10px] gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                {u.email && <span>{u.email}</span>}
                {u.student_id && <span>ID: {u.student_id}</span>}
                {u.major && <span>{u.major}</span>}
              </div>
            </div>

            <Button
              variant={u.is_admin ? 'destructive' : 'outline'}
              size="sm"
              className="h-8 gap-1.5 text-xs shrink-0"
              onClick={() => handleToggleAdmin(u.id)}
              disabled={togglingId === u.id}
            >
              {togglingId === u.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : u.is_admin ? (
                <>
                  <ShieldOff className="h-3.5 w-3.5" />
                  Remove Admin
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5" />
                  Make Admin
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();

  if (!user?.is_admin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
          <ShieldAlert className="h-12 w-12" />
          <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
          <p className="text-sm">You do not have admin privileges to view this page.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Admin Panel
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage reports and user permissions
          </p>
        </div>

        <Tabs defaultValue="reports">
          <TabsList>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
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
