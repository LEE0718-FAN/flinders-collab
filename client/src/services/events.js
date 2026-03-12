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

export async function createEvent(roomId, eventData) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(eventData),
  });
  if (!res.ok) throw await safeJsonError(res, 'Failed to create event');
  return res.json();
}

export async function getEvents(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/events`, { headers });
  if (!res.ok) throw await safeJsonError(res, 'Failed to fetch events');
  return res.json();
}

export async function updateEvent(roomId, eventId, eventData) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(eventData),
  });
  if (!res.ok) throw await safeJsonError(res, 'Failed to update event');
  return res.json();
}

export async function deleteEvent(roomId, eventId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw await safeJsonError(res, 'Failed to delete event');
  return res.json();
}
