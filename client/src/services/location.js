import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function startSharing(eventId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/start`, { method: 'POST', headers });
  return parseResponse(res);
}

export async function updateLocation(eventId, payload) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/update`, { method: 'POST', headers, body: JSON.stringify(payload) });
  return parseResponse(res);
}

export async function stopSharing(eventId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location/stop`, { method: 'POST', headers });
  return parseResponse(res);
}

export async function getLocationStatus(eventId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}/location-status`, { headers });
  return parseResponse(res);
}
