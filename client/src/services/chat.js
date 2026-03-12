import { getAuthHeaders, parseResponse } from '@/lib/api-headers';

export async function getMessages(roomId, cursor) {
  const headers = getAuthHeaders();
  const params = cursor ? `?cursor=${cursor}` : '';
  const res = await fetch(`/api/rooms/${roomId}/messages${params}`, { headers });
  return parseResponse(res);
}
