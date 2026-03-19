const TOKEN_KEY = 'flinders_session';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage || null;
}

export function saveSession(session) {
  try {
    const storage = getStorage();
    storage?.setItem(TOKEN_KEY, JSON.stringify(session));
  } catch {
    // storage not available
  }
}

export function loadStoredSession() {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isSessionExpired(session, skewMs = 30 * 1000) {
  if (!session?.expires_at) return false;
  const expiresAtMs = Number(session.expires_at) * 1000;
  if (!Number.isFinite(expiresAtMs)) return false;
  return Date.now() + skewMs >= expiresAtMs;
}

export function loadSession() {
  const session = loadStoredSession();
  if (!session) return null;
  if (isSessionExpired(session)) {
    clearSession();
    return null;
  }
  return session;
}

export function clearSession() {
  try {
    const storage = getStorage();
    storage?.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getAccessToken() {
  const session = loadSession();
  return session?.access_token || null;
}
