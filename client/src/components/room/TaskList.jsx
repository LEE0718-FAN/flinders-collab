import React, { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle2, Circle, Clock, Trash2, Pencil, Plus,
  Loader2, CalendarDays, GripVertical, UserPlus, AlertCircle, Users,
} from 'lucide-react';
import { createTask, updateTask, deleteTask, toggleAssignee, addAssignees } from '@/services/tasks';
import { useToast } from '@/components/ui/toast';

const priorityConfig = {
  low:    { dot: 'bg-slate-400', label: 'Low',    border: 'border-l-slate-400' },
  medium: { dot: 'bg-amber-500', label: 'Medium', border: 'border-l-amber-500' },
  high:   { dot: 'bg-red-500',   label: 'High',   border: 'border-l-red-500' },
};

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });

  if (diffDays < 0) return { text: formatted, overdue: true, label: 'Overdue' };
  if (diffDays === 0) return { text: 'Today', overdue: false, label: 'Due today' };
  if (diffDays === 1) return { text: 'Tomorrow', overdue: false, label: 'Due tomorrow' };
  if (diffDays <= 7) return { text: formatted, overdue: false, label: `${diffDays} days left` };
  return { text: formatted, overdue: false, label: formatted };
}

function getInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── Task Creation Form ─── */
function TaskCreateForm({ roomId, members = [], currentUserId, onCreated, onError }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const toggleMember = (member) => {
    const id = member.user_id || member.id;
    setAssignedMembers((prev) => {
      const exists = prev.find((m) => (m.user_id || m.id) === id);
      if (exists) return prev.filter((m) => (m.user_id || m.id) !== id);
      return [...prev, member];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || assignedMembers.length === 0) return;
    setSubmitting(true);

    try {
      const assigneeIds = assignedMembers.map((m) => m.user_id || m.id);
      const createdTask = await createTask(roomId, {
        title: title.trim(),
        assignees: assigneeIds,
        due_date: dueDate ? new Date(`${dueDate}T23:59`).toISOString() : undefined,
        priority,
      });

      setTitle('');
      setDueDate('');
      setPriority('medium');
      setAssignedMembers([]);
      setShowMemberPicker(false);
      onCreated?.(createdTask);
    } catch (err) {
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border-2 border-dashed border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Plus className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">New Task</h3>
      </div>

      <Input
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={submitting}
        className="text-base h-11 font-medium"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Due Date
          </label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={submitting}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={submitting}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Assignees section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Assign to ({assignedMembers.length})
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowMemberPicker(!showMemberPicker)}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            {showMemberPicker ? 'Hide' : 'Select Members'}
          </Button>
        </div>

        {/* Selected members */}
        {assignedMembers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {assignedMembers.map((m) => {
              const id = m.user_id || m.id;
              const name = m.full_name || m.university_email || 'Unknown';
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 pl-1 pr-2 py-1 text-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] font-semibold bg-green-100 text-green-700">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-green-800">{name}</span>
                  <button
                    type="button"
                    onClick={() => toggleMember(m)}
                    className="ml-0.5 text-green-400 hover:text-red-500 transition-colors text-xs font-bold"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Member picker */}
        {showMemberPicker && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-lg border bg-muted/30 p-3 max-h-48 overflow-y-auto">
            {members.map((m) => {
              const id = m.user_id || m.id;
              const name = m.full_name || m.university_email || 'Unknown';
              const isSelected = assignedMembers.some((am) => (am.user_id || am.id) === id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleMember(m)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all min-h-[44px] ${
                    isSelected
                      ? 'bg-green-100 border border-green-300 text-green-800 font-medium'
                      : 'bg-white border border-transparent hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className={`text-[10px] font-semibold ${isSelected ? 'bg-green-200 text-green-800' : 'bg-primary/10 text-primary'}`}>
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{name}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 ml-auto shrink-0 text-green-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-10"
        disabled={submitting || !title.trim() || assignedMembers.length === 0}
      >
        {submitting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
        ) : (
          <><Plus className="mr-2 h-4 w-4" />Create Task</>
        )}
      </Button>
      {title.trim() && assignedMembers.length === 0 && (
        <p className="text-xs text-muted-foreground text-center -mt-2">
          Select at least one team member to assign
        </p>
      )}
    </form>
  );
}

/* ─── Assignee Status Config ─── */
const assigneeStatusConfig = {
  pending:     { label: 'Pending',     bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: Circle },
  in_progress: { label: 'In Progress', bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  completed:   { label: 'Done',        bg: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
};

/* ─── Task Card with Multi-Assignee Status ─── */
function TaskCard({ task, roomId, currentUserId, members = [], onStatusChange, onEdit, onDelete, onAssigneesAdded }) {
  const [addingMembers, setAddingMembers] = useState(false);
  const [toggling, setToggling] = useState(null);
  const prio = priorityConfig[task.priority] || priorityConfig.medium;
  const due = formatDueDate(task.due_date);

  // Get assignees from task_assignees or fall back to single assignee
  const assignees = task.task_assignees && task.task_assignees.length > 0
    ? task.task_assignees
    : task.assignee
      ? [{ user_id: task.assignee.id, status: task.status || 'pending', users: task.assignee }]
      : [];

  const completedCount = assignees.filter((a) => a.status === 'completed').length;
  const allDone = assignees.length > 0 && completedCount === assignees.length;
  const progress = assignees.length > 0 ? Math.round((completedCount / assignees.length) * 100) : 0;

  const handleStatusCycle = async (assignee) => {
    const userId = assignee.user_id;
    setToggling(userId);
    try {
      await onStatusChange(task.id, userId);
    } finally {
      setToggling(null);
    }
  };

  // Members not yet assigned
  const unassignedMembers = members.filter((m) => {
    const mid = m.user_id || m.id;
    return !assignees.some((a) => a.user_id === mid);
  });

  const handleAddAssignees = async (memberIds) => {
    try {
      const result = await addAssignees(roomId, task.id, memberIds);
      onAssigneesAdded?.(task.id, result);
      setAddingMembers(false);
    } catch {
      // fail silently
    }
  };

  return (
    <div className={`rounded-xl border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden border-l-[3px] ${prio.border} ${allDone ? 'opacity-50' : ''}`}>
      <div className="p-4">
        {/* Header: Title + actions */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={`text-[15px] font-bold leading-snug flex-1 ${allDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </h3>
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => onEdit(task)} className="p-1.5 sm:p-1 rounded hover:bg-muted transition-colors">
                  <Pencil className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Edit</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => onDelete(task)} className="p-1.5 sm:p-1 rounded hover:bg-red-50 transition-colors">
                  <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground hover:text-red-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Delete</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Meta: Due date + priority + progress */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {due ? (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
              due.overdue && !allDone ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {due.text}
              {due.overdue && !allDone && <span className="text-red-500 font-semibold">· Overdue</span>}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/40">
              <Clock className="h-3.5 w-3.5" />
              No due date
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${prio.dot}`} />
            {prio.label}
          </span>
          {assignees.length > 0 && (
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${allDone ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              {completedCount}/{assignees.length} done
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        {assignees.length > 1 && (
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Assignees with status badges */}
        <div className="mt-3 space-y-1.5">
          {assignees.map((assignee) => {
            const user = assignee.users || {};
            const name = user.full_name || user.university_email || 'Unknown';
            const isToggling = toggling === assignee.user_id;
            const aStatus = assigneeStatusConfig[assignee.status] || assigneeStatusConfig.pending;
            const StatusIcon = aStatus.icon;

            return (
              <div
                key={assignee.user_id || assignee.id}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all min-h-[44px] ${
                  assignee.status === 'completed' ? 'bg-green-50/60' : assignee.status === 'in_progress' ? 'bg-blue-50/60' : 'bg-muted/30'
                }`}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className={`text-[9px] font-semibold ${
                    assignee.status === 'completed' ? 'bg-green-200 text-green-800' : assignee.status === 'in_progress' ? 'bg-blue-200 text-blue-800' : 'bg-muted text-muted-foreground'
                  }`}>
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className={`flex-1 truncate font-medium ${assignee.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {name}
                </span>
                <button
                  onClick={() => handleStatusCycle(assignee)}
                  disabled={isToggling}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 shrink-0 ${aStatus.bg}`}
                >
                  {isToggling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <StatusIcon className="h-3 w-3" />
                  )}
                  {aStatus.label}
                </button>
              </div>
            );
          })}
        </div>

        {/* Add member button */}
        {unassignedMembers.length > 0 && (
          <div className="mt-2">
            {!addingMembers ? (
              <button
                onClick={() => setAddingMembers(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1 min-h-[36px]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add member
              </button>
            ) : (
              <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2">
                {unassignedMembers.map((m) => {
                  const id = m.user_id || m.id;
                  const name = m.full_name || m.university_email || 'Unknown';
                  return (
                    <button
                      key={id}
                      onClick={() => handleAddAssignees([id])}
                      className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-primary/5 transition-colors min-h-[36px]"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px] font-semibold bg-primary/10 text-primary">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{name}</span>
                      <Plus className="h-3 w-3 ml-auto text-muted-foreground" />
                    </button>
                  );
                })}
                <button
                  onClick={() => setAddingMembers(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main TaskList Component ─── */
export default function TaskList({ tasks = [], members = [], roomId, currentUserId, onTasksChange }) {
  const { addToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const syncTasks = (updater) => {
    setLocalTasks((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onTasksChange?.(next);
      return next;
    });
  };

  const handleToggleAssignee = async (taskId, userId) => {
    const statusCycle = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
    // Optimistic update
    syncTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updatedAssignees = (t.task_assignees || []).map((a) =>
          a.user_id === userId ? { ...a, status: statusCycle[a.status] || 'pending' } : a
        );
        const allDone = updatedAssignees.every((a) => a.status === 'completed');
        const anyInProgress = updatedAssignees.some((a) => a.status === 'in_progress' || a.status === 'completed');
        return {
          ...t,
          task_assignees: updatedAssignees,
          status: allDone ? 'completed' : anyInProgress ? 'in_progress' : 'pending',
        };
      })
    );

    try {
      await toggleAssignee(roomId, taskId, userId);
    } catch (err) {
      // Revert on error
      syncTasks(tasks);
      addToast(err.message || 'Failed to update', 'error');
    }
  };

  const handleAssigneesAdded = (taskId, updatedTask) => {
    syncTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
    );
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const previousTasks = localTasks;
    syncTasks((prev) => prev.filter((task) => task.id !== confirmDelete.id));
    try {
      await deleteTask(roomId, confirmDelete.id);
    } catch (err) {
      syncTasks(previousTasks);
      addToast(err.message || 'Failed to delete task.', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleEditOpen = (task) => {
    setEditTask(task);
    const dueDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';
    setEditForm({
      title: task.title || '',
      due_date: dueDate,
      priority: task.priority || 'medium',
    });
  };

  const handleEditSave = async () => {
    if (!editTask) return;
    setEditLoading(true);
    try {
      const updates = { title: editForm.title.trim() };
      if (editForm.due_date) {
        updates.due_date = new Date(`${editForm.due_date}T23:59`).toISOString();
      } else {
        updates.due_date = null;
      }
      updates.priority = editForm.priority;
      const updatedTask = await updateTask(roomId, editTask.id, updates);
      syncTasks((prev) =>
        prev.map((task) => (
          task.id === editTask.id
            ? { ...task, ...updatedTask }
            : task
        ))
      );
      setEditTask(null);
    } catch {
      addToast('Failed to save task changes.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleTaskCreated = (createdTask) => {
    syncTasks((prev) => [createdTask, ...prev]);
    setShowForm(false);
  };

  // Separate active and completed
  const activeTasks = localTasks.filter((t) => t.status !== 'completed');
  const completedTasks = localTasks.filter((t) => t.status === 'completed');

  return (
    <>
      {/* Toggle form */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant={showForm ? 'secondary' : 'default'}
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="min-h-[44px] sm:min-h-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Hide Form' : 'New Task'}
        </Button>
        {localTasks.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {activeTasks.length} active · {completedTasks.length} done
          </p>
        )}
      </div>

      {/* Task creation form */}
      {showForm && (
        <div className="mb-6">
          <TaskCreateForm
            roomId={roomId}
            members={members}
            currentUserId={currentUserId}
            onCreated={handleTaskCreated}
            onError={(err) => addToast(err.message || 'Failed to create task.', 'error')}
          />
        </div>
      )}

      {/* Task grid */}
      {localTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg font-semibold text-muted-foreground">No tasks yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Create a task and assign team members
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active ({activeTasks.length})
              </h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {activeTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    roomId={roomId}
                    currentUserId={currentUserId}
                    members={members}
                    onStatusChange={handleToggleAssignee}
                    onEdit={handleEditOpen}
                    onDelete={(t) => setConfirmDelete({ id: t.id, title: t.title })}
                    onAssigneesAdded={handleAssigneesAdded}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Completed ({completedTasks.length})
              </h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    roomId={roomId}
                    currentUserId={currentUserId}
                    members={members}
                    onStatusChange={handleToggleAssignee}
                    onEdit={handleEditOpen}
                    onDelete={(t) => setConfirmDelete({ id: t.id, title: t.title })}
                    onAssigneesAdded={handleAssigneesAdded}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit task dialog */}
      <Dialog open={!!editTask} onOpenChange={(open) => !open && setEditTask(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title || ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                disabled={editLoading}
                className="text-base font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={editForm.due_date || ''}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={editForm.priority || 'medium'}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  disabled={editLoading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTask(null)} disabled={editLoading}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editLoading || !editForm.title?.trim()}>
              {editLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{confirmDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
