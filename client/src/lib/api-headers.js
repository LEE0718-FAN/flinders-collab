import { getAccessToken } from '@/lib/auth-token';

export function getAuthHeaders(isJson = true) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('You must be signed in to use this feature.');
  }
  const headers = { Authorization: `Bearer ${token}` };
  if (isJson) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function parseResponse(res) {
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
