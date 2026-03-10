import { supabase } from '@/lib/supabase';

async function getAuthHeaders(isJson = true) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { Authorization: `Bearer ${session?.access_token}` };
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
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
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to upload file');
  return res.json();
}

export async function getFiles(roomId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/files`, { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch files');
  return res.json();
}

export async function deleteFile(roomId, fileId) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/rooms/${roomId}/files/${fileId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete file');
  return res.json();
}
