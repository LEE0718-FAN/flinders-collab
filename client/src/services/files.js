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

export async function uploadFile(roomId, file, { description, category, event_id } = {}) {
  const headers = await getAuthHeaders(false);
  const formData = new FormData();
  formData.append('file', file);
  if (description) formData.append('description', description);
  if (category) formData.append('category', category);
  if (event_id) formData.append('event_id', event_id);
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

export async function deleteFile(roomId, fileId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
    headers,
  });
  return parseResponse(res);
}
