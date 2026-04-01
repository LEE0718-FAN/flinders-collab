import { getAccessToken, loadStoredSession, isSessionExpired, saveSession, clearSession } from '@/lib/auth-token';
import { apiUrl } from '@/lib/api';

// In-flight refresh promise to avoid concurrent refresh calls
let refreshPromise = null;
let hasTriedRefresh = false;

async function refreshTokenIfNeeded() {
  const session = loadStoredSession();
  if (!session?.refresh_token) return null;

  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!res.ok) return null;
      const result = await res.json();
      const newSession = {
        ...session,
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token || session.refresh_token,
        expires_at: result.session.expires_at,
      };
      saveSession(newSession);
      return newSession.access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

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

  // On 401, try refreshing token once then reload so all data re-fetches
  if (res.status === 401 && !hasTriedRefresh) {
    hasTriedRefresh = true;
    const freshToken = await refreshTokenIfNeeded();
    if (freshToken) {
      // Token refreshed — reload page so all hooks re-fetch with fresh token
      window.location.reload();
      // Return a pending promise to prevent further processing during reload
      return new Promise(() => {});
    }
    // Refresh failed — force logout
    clearSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return new Promise(() => {});
  }

  if (!res.ok) {
    const message = body?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}
