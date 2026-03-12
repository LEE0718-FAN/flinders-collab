import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Trash2, Plus } from 'lucide-react';
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
        due_date: dueDate || undefined,
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
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <input
        type="text"
        placeholder="Add task..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={submitting}
        className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        disabled={submitting}
        className="text-xs bg-transparent border border-input rounded px-1.5 py-0.5 w-[120px] shrink-0"
      />
    </form>
  );
}

export default function TaskList({ tasks = [], members = [], roomId, currentUserId, onUpdated }) {
  const handleMarkComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updateTask(roomId, task.id, { status: newStatus });
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update task:', err.message);
    }
  };

  const handleDelete = async (task) => {
    try {
      await deleteTask(roomId, task.id);
      onUpdated?.();
    } catch (err) {
      console.error('Failed to delete task:', err.message);
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
      <p className="text-sm text-muted-foreground text-center py-8">
        No tasks yet. Create one to get started.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {memberEntries.map((member) => {
        const initials = member.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        // Sort: active tasks first, completed at bottom
        const activeTasks = member.tasks.filter((t) => t.status !== 'completed');
        const completedTasks = member.tasks.filter((t) => t.status === 'completed');
        const sortedTasks = [...activeTasks, ...completedTasks];

        return (
          <div key={member.id} className="rounded-lg border border-border bg-card">
            {/* Member row */}
            <div className="flex items-start gap-4 p-4">
              {/* Member info - left side */}
              <div className="flex items-center gap-3 w-48 shrink-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.tasks.length} {member.tasks.length === 1 ? 'task' : 'tasks'}
                  </p>
                </div>
              </div>

              {/* Tasks - right side */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {sortedTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-1">No tasks assigned</p>
                )}
                {sortedTasks.map((task) => {
                  const dotClass = priorityDot[task.priority] || priorityDot.medium;
                  const due = formatDueDate(task.due_date);
                  const isCompleted = task.status === 'completed';
                  const canAct = task.assigned_to === currentUserId || task.assigned_by === currentUserId;

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                        isCompleted ? 'opacity-40 bg-muted/30' : 'bg-muted/50'
                      }`}
                    >
                      {/* Complete toggle */}
                      {canAct && (
                        <button
                          onClick={() => handleMarkComplete(task)}
                          className="shrink-0"
                          title={isCompleted ? 'Mark as pending' : 'Mark as complete'}
                        >
                          <CheckCircle2
                            className={`h-4 w-4 ${
                              isCompleted ? 'text-green-500' : 'text-muted-foreground/40 hover:text-green-500'
                            }`}
                          />
                        </button>
                      )}
                      {!canAct && (
                        <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />
                      )}

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

                      {/* Priority dot */}
                      {canAct && <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />}

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
                        <button
                          onClick={() => handleDelete(task)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          title="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Inline add task */}
                <InlineAddTask roomId={roomId} memberId={member.id} onCreated={onUpdated} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
