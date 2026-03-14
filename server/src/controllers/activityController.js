const { supabaseAdmin } = require('../services/supabase');

async function getRoomActivity(req, res, next) {
  try {
    const { roomId } = req.params;
    const activities = [];

    // Recent messages (last 10)
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, content, created_at, user_id, users!inner(full_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messages) {
      messages.forEach((m) => {
        activities.push({
          id: `msg-${m.id}`,
          type: 'message',
          user_name: m.users?.full_name || 'Someone',
          description: m.content?.substring(0, 80) + (m.content?.length > 80 ? '...' : ''),
          created_at: m.created_at,
        });
      });
    }

    // Recent files (last 5)
    const { data: files } = await supabaseAdmin
      .from('files')
      .select('id, file_name, file_description, category, created_at, uploaded_by, users!inner(full_name)')
      .eq('room_id', roomId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (files) {
      files.forEach((f) => {
        activities.push({
          id: `file-${f.id}`,
          type: 'file',
          user_name: f.users?.full_name || 'Someone',
          description: `uploaded "${f.file_name}"`,
          created_at: f.created_at,
        });
      });
    }

    // Recent events (last 5)
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('id, title, created_at, created_by, users!inner(full_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (events) {
      events.forEach((e) => {
        activities.push({
          id: `event-${e.id}`,
          type: 'event',
          user_name: e.users?.full_name || 'Someone',
          description: `created event "${e.title}"`,
          created_at: e.created_at,
        });
      });
    }

    // Recent tasks (last 5)
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id, title, created_at, created_by, users!inner(full_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tasks) {
      tasks.forEach((t) => {
        activities.push({
          id: `task-${t.id}`,
          type: 'task',
          user_name: t.users?.full_name || 'Someone',
          description: `added task "${t.title}"`,
          created_at: t.created_at,
        });
      });
    }

    // Sort all by created_at descending
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(activities.slice(0, 15));
  } catch (err) {
    next(err);
  }
}

module.exports = { getRoomActivity };
