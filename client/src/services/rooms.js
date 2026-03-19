import { apiUrl } from '@/lib/api';
import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function createRoom(roomData) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/rooms'), { method: 'POST', headers, body: JSON.stringify(roomData) });
  return parseResponse(res);
}

export async function getRooms() {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/rooms'), { headers });
  return parseResponse(res);
}

export async function getRoom(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}`), { headers });
  return parseResponse(res);
}

export async function joinRoom(inviteCode) {
  const headers = getAuthHeaders();
  const normalizedCode = String(inviteCode || '').trim().toUpperCase();
  const res = await fetch(apiUrl('/api/rooms/join'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ invite_code: normalizedCode }),
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const error = new Error(body?.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.room = body?.room || null;
    throw error;
  }

  return body;
}

export async function getMembers(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/members`), { headers });
  return parseResponse(res);
}

export async function updateRoom(roomId, data) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}`), { method: 'PATCH', headers, body: JSON.stringify(data) });
  return parseResponse(res);
}

export async function deleteRoom(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}`), { method: 'DELETE', headers });
  return parseResponse(res);
}

export async function leaveRoom(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/leave`), { method: 'POST', headers });
  return parseResponse(res);
}

export async function getRoomActivity(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/activity`), { headers });
  return parseResponse(res);
}

export async function getRoomActivitySummary() {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/rooms/activity-summary'), { headers });
  return parseResponse(res);
}

export async function markRoomVisited(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/visit`), {
    method: 'POST',
    headers,
  });
  return parseResponse(res);
}

export async function getQuickLinks(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/quick-links`), { headers });
  return parseResponse(res);
}

export async function createQuickLink(roomId, data) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/quick-links`), {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return parseResponse(res);
}

export async function deleteQuickLink(roomId, linkId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/quick-links/${linkId}`), {
    method: 'DELETE',
    headers,
  });
  return parseResponse(res);
}
