import { supabase } from '@/lib/supabase';

async function getAuthHeaders(isJson = true) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to use this feature.');
  }
  const headers = { Authorization: `Bearer ${session.access_token}` };
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
}

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

export async function uploadFile(roomId, file) {
  const headers = await getAuthHeaders(false);
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`/api/rooms/${roomId}/files`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return parseResponse(res);
}

export async function getFiles(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/files`, { headers });
  return parseResponse(res);
}

/**
 * Delete a file. Backend route is DELETE /api/files/:fileId.
 * Only the uploader or room admin/owner can delete.
 */
export async function deleteFile(roomId, fileId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
    headers,
  });
  return parseResponse(res);
}
