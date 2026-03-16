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

export function loadSession() {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.expires_at) {
      const expiresAtMs = Number(parsed.expires_at) * 1000;
      if (Number.isFinite(expiresAtMs) && Date.now() >= expiresAtMs) {
        storage?.removeItem(TOKEN_KEY);
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
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
