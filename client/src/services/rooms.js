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

export async function createRoom(roomData) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers,
    body: JSON.stringify(roomData),
  });
  if (!res.ok) throw await safeJsonError(res, 'Failed to create room');
  return res.json();
}

export async function getRooms() {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/rooms', { headers });
  if (!res.ok) throw await safeJsonError(res, 'Failed to fetch rooms');
  return res.json();
}

export async function getRoom(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}`, { headers });
  if (!res.ok) throw await safeJsonError(res, 'Failed to fetch room');
  return res.json();
}

export async function joinRoom(inviteCode) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/rooms/join', {
    method: 'POST',
    headers,
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  if (!res.ok) throw await safeJsonError(res, 'Failed to join room');
  return res.json();
}

export async function getMembers(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/members`, { headers });
  if (!res.ok) throw await safeJsonError(res, 'Failed to fetch members');
  return res.json();
}

export async function deleteRoom(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE', headers });
  if (!res.ok) throw await safeJsonError(res, 'Failed to delete room');
  return res.json();
}
