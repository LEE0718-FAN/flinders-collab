const { supabaseAdmin } = require('../services/supabase');

function formatMessage(message) {
  return {
    ...message,
    sender_name:
      message.users?.full_name ||
      message.users?.university_email ||
      message.sender_name ||
      'User',
  };
}

/**
 * GET /rooms/:roomId/messages
 * Get messages for a room with pagination.
 */
async function getMessages(req, res, next) {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;

    const pageLimit = Math.min(parseInt(limit, 10) || 50, 100);

    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(pageLimit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Return in chronological order
    res.json(data.reverse().map(formatMessage));
  } catch (err) {
    next(err);
  }
}

/**
 * Save a message to the database (used by both REST and Socket.IO).
 */
async function saveMessage({ room_id, user_id, content, message_type = 'text' }) {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      room_id,
      user_id,
      content,
      message_type,
    })
    .select(`
      *,
      users:user_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return formatMessage(data);
}

module.exports = {
  getMessages,
  saveMessage,
};
