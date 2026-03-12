import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function createEvent(roomId, eventData) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/events`, { method: 'POST', headers, body: JSON.stringify(eventData) });
  return parseResponse(res);
}

export async function getEvents(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/events`, { headers });
  return parseResponse(res);
}

export async function updateEvent(roomId, eventId, eventData) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}`, { method: 'PATCH', headers, body: JSON.stringify(eventData) });
  return parseResponse(res);
}

export async function deleteEvent(roomId, eventId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE', headers });
  return parseResponse(res);
}
