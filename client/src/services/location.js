import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to use this feature.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Parse a response and return { ok, data, error }.
 */
async function parseResponse(res) {
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message = body?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

/**
 * Start sharing location for an event.
 * The backend creates / reactivates a session with status "on_the_way".
 * Returns the location session object.
 */
export async function startSharing(eventId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/start`, {
    method: 'POST',
    headers,
  });
  return parseResponse(res);
}

/**
 * Update current coordinates (and optionally status) for an active session.
 * @param {string} eventId
 * @param {{ latitude: number, longitude: number, status?: string }} payload
 * Returns the updated session object.
 */
export async function updateLocation(eventId, payload) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/update`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

/**
 * Stop sharing location for an event.
 * Returns { message, session }.
 */
export async function stopSharing(eventId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/stop`, {
    method: 'POST',
    headers,
  });
  return parseResponse(res);
}

/**
 * Get all active location sessions for an event.
 * Returns an array of session objects with joined user data.
 * Each session has: id, event_id, user_id, latitude, longitude, status, updated_at,
 * and a nested users object { id, full_name, avatar_url }.
 */
export async function getLocationStatus(eventId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location-status`, { headers });
  return parseResponse(res);
}
