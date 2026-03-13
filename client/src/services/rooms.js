import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function createRoom(roomData) {
  const headers = getAuthHeaders();
  const res = await fetch('/api/rooms', { method: 'POST', headers, body: JSON.stringify(roomData) });
  return parseResponse(res);
}

export async function getRooms() {
  const headers = getAuthHeaders();
  const res = await fetch('/api/rooms', { headers });
  return parseResponse(res);
}

export async function getRoom(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}`, { headers });
  return parseResponse(res);
}

export async function joinRoom(inviteCode) {
  const headers = getAuthHeaders();
  const res = await fetch('/api/rooms/join', { method: 'POST', headers, body: JSON.stringify({ invite_code: inviteCode }) });
  return parseResponse(res);
}

export async function getMembers(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/members`, { headers });
  return parseResponse(res);
}

export async function deleteRoom(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE', headers });
  return parseResponse(res);
}

export async function leaveRoom(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/leave`, { method: 'POST', headers });
  return parseResponse(res);
}
