import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

async function safeJsonError(res, fallback) {
  try {
    const body = await res.json();
    return new Error(body.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function apiSignup(userData) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!res.ok) throw await safeJsonError(res, 'Signup failed');
  return res.json();
}

export async function apiLogin(credentials) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) throw await safeJsonError(res, 'Login failed');
  return res.json();
}

export async function apiLogout() {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/auth/logout', { method: 'POST', headers });
  if (!res.ok) throw await safeJsonError(res, 'Logout failed');
  return res.json();
}

export async function getMe() {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/auth/me', { headers });
  if (!res.ok) throw await safeJsonError(res, 'Failed to get user');
  return res.json();
}
