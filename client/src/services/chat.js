import { supabase } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

export async function getMessages(roomId, cursor) {
  const headers = await getAuthHeaders();
  const params = cursor ? `?cursor=${cursor}` : '';
  const res = await fetch(`/api/rooms/${roomId}/messages${params}`, { headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch messages');
  return res.json();
}
