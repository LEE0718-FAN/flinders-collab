const { supabaseAdmin } = require('../services/supabase');

async function getRoomActivity(req, res, next) {
  try {
    const { roomId } = req.params;

    // Parallel fetch all activity sources
    const [messagesResult, filesResult, eventsResult, tasksResult] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('id, content, created_at, user_id, users!inner(full_name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('files')
        .select('id, file_name, created_at, uploaded_by, users!inner(full_name)')
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('events')
        .select('id, title, created_at, created_by, users!inner(full_name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('tasks')
        .select('id, title, created_at, created_by, users!inner(full_name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const activities = [];

    for (const m of messagesResult.data || []) {
      activities.push({
        id: `msg-${m.id}`,
        type: 'message',
        user_name: m.users?.full_name || 'Someone',
        description: m.content?.substring(0, 80) + (m.content?.length > 80 ? '...' : ''),
        created_at: m.created_at,
      });
    }
    for (const f of filesResult.data || []) {
      activities.push({
        id: `file-${f.id}`,
        type: 'file',
        user_name: f.users?.full_name || 'Someone',
        description: `uploaded "${f.file_name}"`,
        created_at: f.created_at,
      });
    }
    for (const e of eventsResult.data || []) {
      activities.push({
        id: `event-${e.id}`,
        type: 'event',
        user_name: e.users?.full_name || 'Someone',
        description: `created event "${e.title}"`,
        created_at: e.created_at,
      });
    }
    for (const t of tasksResult.data || []) {
      activities.push({
        id: `task-${t.id}`,
        type: 'task',
        user_name: t.users?.full_name || 'Someone',
        description: `added task "${t.title}"`,
        created_at: t.created_at,
      });
    }

    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(activities.slice(0, 15));
  } catch (err) {
    next(err);
  }
}

module.exports = { getRoomActivity };
