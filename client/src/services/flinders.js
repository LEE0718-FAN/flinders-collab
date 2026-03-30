import { getAuthHeaders, parseResponse } from '@/lib/api-headers';
import { apiUrl } from '@/lib/api';

export async function getFlindersEvents() {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/flinders/events'), { headers });
  return parseResponse(res);
}

export async function getFlindersNews() {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/flinders/news'), { headers });
  return parseResponse(res);
}

export async function getRecommendedEvents(interests = []) {
  const headers = getAuthHeaders();
  const query = interests.length > 0 ? `?interests=${encodeURIComponent(interests.join(','))}` : '';
  const res = await fetch(apiUrl(`/api/flinders/recommended-events${query}`), { headers });
  return parseResponse(res);
}

export async function getCampusPresence() {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/flinders/campus-presence'), { headers });
  return parseResponse(res);
}

export async function updateCampusPresence(payload) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/flinders/campus-presence'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseResponse(res);
}

export async function clearCampusPresence() {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/flinders/campus-presence'), {
    method: 'DELETE',
    headers,
  });
  return parseResponse(res);
}
