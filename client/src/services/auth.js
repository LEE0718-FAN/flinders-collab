import { apiUrl } from '@/lib/api';
import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function apiSignup(userData) {
  const res = await fetch(apiUrl('/api/auth/signup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return parseResponse(res);
}

export async function apiLogin(credentials) {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return parseResponse(res);
}

export async function apiRequestPasswordReset(email) {
  const res = await fetch(apiUrl('/api/auth/password/reset'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return parseResponse(res);
}

export async function apiLogout() {
  const res = await fetch(apiUrl('/api/auth/logout'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(res);
}

export async function apiGuestLogin() {
  const res = await fetch(apiUrl('/api/auth/guest'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseResponse(res);
}

export async function apiGuestCleanup() {
  const res = await fetch(apiUrl('/api/auth/guest/cleanup'), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(res);
}

export async function apiUpdateProfile(formData) {
  const headers = getAuthHeaders(false); // Don't set Content-Type for FormData
  const res = await fetch(apiUrl('/api/auth/me'), {
    method: 'PATCH',
    headers,
    body: formData,
  });
  return parseResponse(res);
}
