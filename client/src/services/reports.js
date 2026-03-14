import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function createReport(data) {
  const headers = getAuthHeaders();
  const res = await fetch('/api/reports', { method: 'POST', headers, body: JSON.stringify(data) });
  return parseResponse(res);
}

export async function getReports(params = {}) {
  const headers = getAuthHeaders();
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/reports${qs ? `?${qs}` : ''}`, { headers });
  return parseResponse(res);
}

export async function updateReport(reportId, data) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/reports/${reportId}`, { method: 'PATCH', headers, body: JSON.stringify(data) });
  return parseResponse(res);
}

export async function getAdminUsers() {
  const headers = getAuthHeaders();
  const res = await fetch('/api/admin/users', { headers });
  return parseResponse(res);
}

export async function toggleUserAdmin(userId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/admin/users/${userId}/admin`, { method: 'PATCH', headers });
  return parseResponse(res);
}

export async function deleteAdminUser(userId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers });
  return parseResponse(res);
}

export async function getMonitorStats() {
  const headers = getAuthHeaders();
  const res = await fetch('/api/admin/monitor', { headers });
  return parseResponse(res);
}

export async function resolveAlert(alertId) {
  const headers = getAuthHeaders();
  const res = await fetch(`/api/admin/alerts/${alertId}/resolve`, { method: 'POST', headers });
  return parseResponse(res);
}

export async function triggerHealthCheck() {
  const headers = getAuthHeaders();
  const res = await fetch('/api/admin/health', { headers });
  return parseResponse(res);
}
