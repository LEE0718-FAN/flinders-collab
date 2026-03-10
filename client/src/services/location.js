import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function startSharing(eventId, coords) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify(coords),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to start sharing');
  return res.json();
}

export async function updateLocation(eventId, coords) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/update`, {
    method: 'POST',
    headers,
    body: JSON.stringify(coords),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update location');
  return res.json();
}

export async function stopSharing(eventId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/stop`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to stop sharing');
  return res.json();
}

export async function getLocationStatus(eventId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location-status`, { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to get location status');
  return res.json();
}
