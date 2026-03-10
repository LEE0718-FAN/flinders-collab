import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function apiSignup(userData) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Signup failed');
  return res.json();
}

export async function apiLogin(credentials) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  return res.json();
}

export async function apiLogout() {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/auth/logout', { method: 'POST', headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Logout failed');
  return res.json();
}

export async function getMe() {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/auth/me', { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to get user');
  return res.json();
}
