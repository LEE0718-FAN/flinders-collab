import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function startSharing(roomId, eventId, coords) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/location/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event_id: eventId, ...coords }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to start sharing');
  return res.json();
}

export async function updateLocation(roomId, coords) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/location/update`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(coords),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update location');
  return res.json();
}

export async function stopSharing(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/location/stop`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to stop sharing');
  return res.json();
}

export async function getLocationStatus(roomId, eventId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/location/status?event_id=${eventId}`, { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to get location status');
  return res.json();
}
