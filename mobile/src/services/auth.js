import { api } from '../lib/api';

/**
 * Login with email and password.
 * Returns { session, user }.
 */
export async function login(email, password) {
  return api.post('/api/auth/login', { email, password });
}

/**
 * Register a new Flinders student account.
 * @param {{ email, password, full_name, student_id, major }} userData
 * Returns { message, user }.
 */
export async function signup({ email, password, full_name, student_id, major }) {
  return api.post('/api/auth/signup', {
    email,
    password,
    full_name,
    student_id,
    major,
    account_type: 'flinders',
  });
}

/**
 * Logout — invalidates the session server-side.
 */
export async function logout() {
  return api.post('/api/auth/logout', {});
}

/**
 * Get the current authenticated user's profile.
 */
export async function getCurrentUser() {
  return api.get('/api/auth/me');
}

/**
 * Refresh the session using a refresh token.
 */
export async function refreshSession(refreshToken) {
  return api.post('/api/auth/refresh', { refresh_token: refreshToken });
}

/**
 * Send a password reset email.
 */
export async function requestPasswordReset(email) {
  return api.post('/api/auth/password/reset', { email });
}
