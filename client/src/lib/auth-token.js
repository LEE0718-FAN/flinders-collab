const TOKEN_KEY = 'flinders_session';

export function saveSession(session) {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  } catch {
    // localStorage not available
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getAccessToken() {
  const session = loadSession();
  return session?.access_token || null;
}
