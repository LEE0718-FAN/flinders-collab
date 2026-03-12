import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

async function safeJsonError(res, fallback) {
  try {
    const body = await res.json();
    return new Error(body.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function createTask(roomId, taskData) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(taskData),
  });
  if (!res.ok) throw await safeJsonError(res, 'Failed to create task');
  return res.json();
}

export async function getTasks(roomId, filters = {}) {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
  const qs = params.toString();
  const url = `/api/rooms/${roomId}/tasks${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw await safeJsonError(res, 'Failed to fetch tasks');
  return res.json();
}

export async function updateTask(roomId, taskId, taskData) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(taskData),
  });
  if (!res.ok) throw await safeJsonError(res, 'Failed to update task');
  return res.json();
}

export async function deleteTask(roomId, taskId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw await safeJsonError(res, 'Failed to delete task');
  return res.json();
}
