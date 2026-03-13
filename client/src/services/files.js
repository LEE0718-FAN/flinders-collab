import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function uploadFile(roomId, file, { description, category, event_id } = {}) {
  const headers = getAuthHeaders(false);
  const formData = new FormData();
  formData.append('file', file);
  if (description) formData.append('description', description);
  if (category) formData.append('category', category);
  if (event_id) formData.append('event_id', event_id);
  const res = await fetch(`/api/rooms/${roomId}/files`, { method: 'POST', headers, body: formData });
  return parseResponse(res);
}

export async function getFiles(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/files`, { headers });
  return parseResponse(res);
}

export async function updateFile(fileId, data) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/files/${fileId}`, { method: 'PATCH', headers, body: JSON.stringify(data) });
  return parseResponse(res);
}

export async function deleteFile(roomId, fileId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE', headers });
  return parseResponse(res);
}
