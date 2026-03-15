import { getAuthHeaders, parseResponse } from '@/lib/api-headers';
import { apiUrl } from '@/lib/api';

export async function getAnnouncements(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/announcements`), { headers });
  return parseResponse(res);
}

export async function createAnnouncement(roomId, content) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/announcements`), {
    method: 'POST', headers, body: JSON.stringify({ content }),
  });
  return parseResponse(res);
}

export async function deleteAnnouncement(announcementId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/announcements/${announcementId}`), { method: 'DELETE', headers });
  return parseResponse(res);
}

export async function markAllRead(roomId) {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl(`/api/rooms/${roomId}/announcements/read-all`), { method: 'POST', headers });
  return parseResponse(res);
}

export async function getUnreadCounts() {
  const headers = getAuthHeaders();
  const res = await fetch(apiUrl('/api/announcements/unread-counts'), { headers });
  return parseResponse(res);
}
