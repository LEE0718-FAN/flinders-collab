import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function createTask(roomId, taskData) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/tasks`, { method: 'POST', headers, body: JSON.stringify(taskData) });
  return parseResponse(res);
}

export async function getTasks(roomId, filters = {}) {
  const headers = getAuthHeaders();
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
  const qs = params.toString();
  const res = await fetch(`/api/rooms/${roomId}/tasks${qs ? `?${qs}` : ''}`, { headers });
  return parseResponse(res);
}

export async function updateTask(roomId, taskId, taskData) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/tasks/${taskId}`, { method: 'PATCH', headers, body: JSON.stringify(taskData) });
  return parseResponse(res);
}

export async function deleteTask(roomId, taskId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/tasks/${taskId}`, { method: 'DELETE', headers });
  return parseResponse(res);
}
