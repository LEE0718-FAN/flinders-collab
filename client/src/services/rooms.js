import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function createRoom(roomData) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers,
    body: JSON.stringify(roomData),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to create room');
  return res.json();
}

export async function getRooms() {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/rooms', { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch rooms');
  return res.json();
}

export async function getRoom(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}`, { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch room');
  return res.json();
}

export async function joinRoom(inviteCode) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/rooms/join', {
    method: 'POST',
    headers,
    body: JSON.stringify({ invite_code: inviteCode }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to join room');
  return res.json();
}

export async function getMembers(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/members`, { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch members');
  return res.json();
}
