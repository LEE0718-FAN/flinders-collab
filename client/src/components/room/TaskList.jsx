import React, { useState, useRef } from 'react';
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
  Loader2, CalendarDays, GripVertical, UserPlus, AlertCircle,
} from 'lucide-react';
import { updateTask, deleteTask, createTask } from '@/services/tasks';

const priorityConfig = {
  low:    { dot: 'bg-slate-400', label: 'Low',    border: 'border-l-slate-400' },
  medium: { dot: 'bg-amber-500', label: 'Medium', border: 'border-l-amber-500' },
  high:   { dot: 'bg-red-500',   label: 'High',   border: 'border-l-red-500' },
};

const statusConfig = {
  pending:     { label: 'Pending',     bg: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-100 text-blue-700' },
  completed:   { label: 'Done',        bg: 'bg-green-100 text-green-700' },
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

/* ─── Task Creation Form with Drag & Drop Member Assignment ─── */
function TaskCreateForm({ roomId, members = [], onCreated }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dropRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const memberId = e.dataTransfer.getData('text/member-id');
    const member = members.find((m) => (m.user_id || m.id) === memberId);
    if (member && !assignedMembers.find((m) => (m.user_id || m.id) === memberId)) {
      setAssignedMembers((prev) => [...prev, member]);
    }
  };

  const removeMember = (memberId) => {
    setAssignedMembers((prev) => prev.filter((m) => (m.user_id || m.id) !== memberId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || assignedMembers.length === 0) return;
    setSubmitting(true);
    try {
      // Create one task per assigned member
      await Promise.all(
        assignedMembers.map((member) =>
          createTask(roomId, {
            title: title.trim(),
            assigned_to: member.user_id || member.id,
            due_date: dueDate ? new Date(`${dueDate}T23:59`).toISOString() : undefined,
            priority,
          })
        )
      );
      setTitle('');
      setDueDate('');
      setPriority('medium');
      setAssignedMembers([]);
      onCreated?.();
    } catch (err) {
      console.error('Failed to create task:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border-2 border-dashed border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">New Task</h3>
        </div>

        {/* Title */}
        <Input
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          className="text-base h-11 font-medium"
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Due Date */}
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

          {/* Priority */}
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

        {/* Drop zone for members */}
        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-4 transition-all ${
            dragOver
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : assignedMembers.length > 0
                ? 'border-green-300 bg-green-50'
                : 'border-muted-foreground/20 bg-muted/30'
          }`}
        >
          {assignedMembers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                Assigned to ({assignedMembers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {assignedMembers.map((m) => {
                  const id = m.user_id || m.id;
                  const name = m.full_name || m.university_email || 'Unknown';
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-green-200 pl-1 pr-2 py-1 text-sm"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{name}</span>
                      <button
                        type="button"
                        onClick={() => removeMember(id)}
                        className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors text-xs font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground/60">
                Drag more members to assign them too
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <UserPlus className={`h-5 w-5 ${dragOver ? 'text-primary' : 'text-muted-foreground/50'}`} />
              <p className={`text-sm ${dragOver ? 'text-primary font-medium' : 'text-muted-foreground/60'}`}>
                Drag a member here to assign this task
              </p>
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
            Drag a team member above to assign this task
          </p>
        )}
      </form>

      {/* Draggable member chips */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Team Members — drag to assign
        </p>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const id = m.user_id || m.id;
            const name = m.full_name || m.university_email || 'Unknown';
            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/member-id', id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="flex items-center gap-2 rounded-full border bg-card pl-1 pr-3 py-1 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30 transition-all select-none"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{name}</span>
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Single Task Card (Compact) ─── */
function TaskCard({ task, onStatusChange, onEdit, onDelete }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const statusBtnRef = useRef(null);
  const prio = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status] || statusConfig.pending;
  const due = formatDueDate(task.due_date);
  const isCompleted = task.status === 'completed';
  const assigneeName = task.assignee?.full_name || task.assignee?.university_email || 'Unassigned';

  const handleStatusSelect = (newStatus) => {
    setStatusOpen(false);
    if (newStatus !== task.status) {
      onStatusChange(task, newStatus);
    }
  };

  return (
    <div
      className={`relative rounded-lg border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden border-l-[3px] ${prio.border} ${
        isCompleted ? 'opacity-50' : ''
      }`}
    >
      <div className="px-3.5 py-3">
        {/* Row 1: Title + actions */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={`text-[15px] font-bold leading-snug flex-1 ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.title}
          </h3>
          <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => onEdit(task)} className="p-1 rounded hover:bg-muted transition-colors">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Edit</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => onDelete(task)} className="p-1 rounded hover:bg-red-50 transition-colors">
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Delete</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Row 2: Due date + priority */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {due ? (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
              due.overdue && !isCompleted ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              <span className="font-normal">Due:</span>
              {due.text}
              {due.overdue && !isCompleted && <span>· Overdue</span>}
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
        </div>

        {/* Row 3: Status badge (click to open menu) + assigned member */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
          {/* Status badge with popup menu */}
          <div>
            <button
              ref={statusBtnRef}
              onClick={() => setStatusOpen(!statusOpen)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer ${status.bg}`}
            >
              {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              {status.label}
            </button>

            {/* Status picker — fixed position to escape overflow */}
            {statusOpen && statusBtnRef.current && (() => {
              const rect = statusBtnRef.current.getBoundingClientRect();
              return (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setStatusOpen(false)} />
                  <div
                    className="fixed z-[101] rounded-lg border bg-popover shadow-lg p-1 min-w-[150px]"
                    style={{ top: rect.bottom + 4, left: rect.left }}
                  >
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusSelect(key)}
                        className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                          task.status === key ? 'bg-muted' : 'hover:bg-muted/60'
                        }`}
                      >
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${cfg.bg}`}>
                          {key === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                          {cfg.label}
                        </span>
                        {task.status === key && <span className="text-primary ml-auto">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Assigned member */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">{assigneeName}</span>
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[8px] font-semibold bg-muted text-muted-foreground">
                {getInitials(assigneeName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main TaskList Component ─── */
export default function TaskList({ tasks = [], members = [], roomId, currentUserId, onUpdated }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleStatusChange = async (task, newStatus) => {
    try {
      await updateTask(roomId, task.id, { status: newStatus });
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update task status:', err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTask(roomId, confirmDelete.id);
      onUpdated?.();
    } catch (err) {
      console.error('Failed to delete task:', err.message);
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
      }
      updates.priority = editForm.priority;
      await updateTask(roomId, editTask.id, updates);
      setEditTask(null);
      onUpdated?.();
    } catch {
      // fail silently
    } finally {
      setEditLoading(false);
    }
  };

  // Separate active and completed
  const activeTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <>
      {/* Toggle form */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant={showForm ? 'secondary' : 'default'}
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? 'Hide Form' : 'New Task'}
        </Button>
        {tasks.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {activeTasks.length} active · {completedTasks.length} done
          </p>
        )}
      </div>

      {/* Task creation form */}
      {showForm && (
        <div className="mb-6">
          <TaskCreateForm roomId={roomId} members={members} onCreated={() => { onUpdated?.(); setShowForm(false); }} />
        </div>
      )}

      {/* Task grid */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg font-semibold text-muted-foreground">No tasks yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Create a task and drag a team member to assign it
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
              <div className="grid gap-4 sm:grid-cols-2">
                {activeTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditOpen}
                    onDelete={(t) => setConfirmDelete({ id: t.id, title: t.title })}
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
              <div className="grid gap-4 sm:grid-cols-2">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEditOpen}
                    onDelete={(t) => setConfirmDelete({ id: t.id, title: t.title })}
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
