import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Clock, Trash2, Plus, ChevronRight } from 'lucide-react';
import { updateTask, deleteTask, createTask } from '@/services/tasks';

const priorityDot = {
  low: 'bg-slate-400',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
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

  if (diffDays < 0) return { text: formatted, overdue: true };
  if (diffDays === 0) return { text: 'Today', overdue: false };
  if (diffDays === 1) return { text: 'Tomorrow', overdue: false };
  return { text: formatted, overdue: false };
}

function InlineAddTask({ roomId, memberId, onCreated }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createTask(roomId, {
        title: title.trim(),
        assigned_to: memberId,
        due_date: dueDate ? new Date(`${dueDate}T23:59`).toISOString() : undefined,
      });
      setTitle('');
      setDueDate('');
      onCreated?.();
    } catch (err) {
      console.error('Failed to create task:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-border/50">
      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <input
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={submitting}
        className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
      />
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground">Due:</span>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={submitting}
          className="h-7 text-xs w-[130px] px-2"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
      >
        Add
      </button>
    </form>
  );
}

export default function TaskList({ tasks = [], members = [], roomId, currentUserId, onUpdated }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const handleMarkComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateTask(roomId, task.id, { status: newStatus });
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update task:', err.message);
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

  const handleStatusChange = async (task, newStatus) => {
    try {
      await updateTask(roomId, task.id, { status: newStatus });
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update task status:', err.message);
    }
  };

  // Build member map
  const memberMap = new Map();
  members.forEach((m) => {
    const id = m.user_id || m.id;
    if (id) {
      memberMap.set(id, {
        id,
        name: m.full_name || m.university_email || 'Unknown',
        tasks: [],
      });
    }
  });

  // Group tasks by assigned_to
  tasks.forEach((task) => {
    const assigneeId = task.assigned_to || 'unassigned';
    if (!memberMap.has(assigneeId)) {
      const name = task.assignee?.full_name || task.assignee?.university_email || 'Unknown';
      memberMap.set(assigneeId, { id: assigneeId, name, tasks: [] });
    }
    memberMap.get(assigneeId).tasks.push(task);
  });

  const memberEntries = Array.from(memberMap.values());

  if (memberEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-sm font-medium text-muted-foreground">No members yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Invite members to start assigning tasks</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {memberEntries.map((member) => {
          const initials = member.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          const activeTasks = member.tasks.filter((t) => t.status !== 'completed');
          const completedTasks = member.tasks.filter((t) => t.status === 'completed');
          const sortedTasks = [...activeTasks, ...completedTasks];
          const completedCount = completedTasks.length;
          const totalCount = member.tasks.length;
          const isExpanded = expandedId === member.id;

          return (
            <div key={member.id} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Member header - clickable */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : member.id)}
                className="w-full flex flex-col gap-2 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{member.name}</p>
                  </div>
                  {totalCount > 0 ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${(completedCount / totalCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{completedCount}/{totalCount}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">No tasks</span>
                  )}
                </div>

                {/* Task preview - always visible when collapsed */}
                {!isExpanded && activeTasks.length > 0 && (
                  <div className="ml-[52px] space-y-1">
                    {activeTasks.slice(0, 3).map((task) => {
                      const dotClass = priorityDot[task.priority] || priorityDot.medium;
                      const due = formatDueDate(task.due_date);
                      return (
                        <div key={task.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`} />
                          <span className="truncate flex-1">{task.title}</span>
                          {due && (
                            <span className={`shrink-0 ${due.overdue ? 'text-red-500 font-medium' : ''}`}>
                              {due.text}
                            </span>
                          )}
                          <span className="shrink-0 text-[10px] px-1.5 py-0 rounded bg-muted">
                            {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                    {activeTasks.length > 3 && (
                      <p className="text-[11px] text-muted-foreground/60 ml-3.5">+{activeTasks.length - 3} more</p>
                    )}
                  </div>
                )}
              </button>

              {/* Expanded tasks */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-1 border-t space-y-1.5">
                  {sortedTasks.map((task) => {
                    const dotClass = priorityDot[task.priority] || priorityDot.medium;
                    const due = formatDueDate(task.due_date);
                    const isCompleted = task.status === 'completed';
                    const canAct = task.assigned_to === currentUserId || task.assigned_by === currentUserId;

                    return (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm ${
                          isCompleted ? 'opacity-40 bg-muted/30' : 'bg-muted/50'
                        }`}
                      >
                        {/* Complete toggle */}
                        {canAct ? (
                          <button
                            onClick={() => handleMarkComplete(task)}
                            className="shrink-0"
                            title={isCompleted ? 'Mark as pending' : 'Mark as complete'}
                          >
                            <CheckCircle2
                              className={`h-4 w-4 ${
                                isCompleted ? 'text-green-500' : 'text-muted-foreground/40 hover:text-green-500'
                              } transition-colors`}
                            />
                          </button>
                        ) : (
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              isCompleted ? 'text-green-500' : 'text-muted-foreground/20'
                            }`}
                          />
                        )}

                        {/* Priority dot */}
                        <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />

                        {/* Title */}
                        <span className={`flex-1 min-w-0 truncate ${isCompleted ? 'line-through' : ''}`}>
                          {task.title}
                        </span>

                        {/* Due date */}
                        {due && (
                          <span
                            className={`text-xs shrink-0 flex items-center gap-1 ${
                              due.overdue && !isCompleted ? 'text-red-500 font-medium' : 'text-muted-foreground'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {due.text}
                          </span>
                        )}
                        {!due && (
                          <span className="text-xs text-muted-foreground/50 shrink-0">No due date</span>
                        )}

                        {/* Status dropdown */}
                        {canAct && !isCompleted && (
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value)}
                            className="text-[10px] rounded border border-input bg-background px-1 py-0.5 shrink-0"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Done</option>
                          </select>
                        )}

                        {/* Delete */}
                        {(task.assigned_by === currentUserId) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setConfirmDelete({ id: task.id, title: task.title })}
                                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p>Delete task</p></TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}

                  {sortedTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-1">No tasks assigned yet</p>
                  )}

                  {/* Inline add task */}
                  <InlineAddTask roomId={roomId} memberId={member.id} onCreated={onUpdated} />
                </div>
              )}
            </div>
          );
        })}
      </div>

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
