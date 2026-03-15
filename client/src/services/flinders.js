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
