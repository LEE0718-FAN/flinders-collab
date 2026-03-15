const { supabaseAdmin } = require('../services/supabase');
const config = require('../config');

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
 * For file-type messages, regenerate signed download URLs
 * since the original URLs embedded in message content expire.
 */
async function refreshFileUrls(messages) {
  const fileMessages = messages.filter((m) => m.message_type === 'file');
  if (fileMessages.length === 0) return messages;

  const bucket = config.upload.storageBucket;

  return Promise.all(
    messages.map(async (msg) => {
      if (msg.message_type !== 'file') return msg;

      try {
        const fileData = JSON.parse(msg.content);
        if (!fileData.file_id) return msg;

        // Fetch current file record to get storage path
        const { data: file } = await supabaseAdmin
          .from('files')
          .select('file_url, file_name, file_type, file_size')
          .eq('id', fileData.file_id)
          .maybeSingle();

        if (!file) return msg;

        // Generate fresh signed URL
        const storagePath = file.file_url;
        const { data: signedData } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(storagePath, 60 * 60); // 1 hour

        const refreshedContent = JSON.stringify({
          ...fileData,
          file_name: file.file_name || fileData.file_name,
          file_type: file.file_type || fileData.file_type,
          file_size: file.file_size || fileData.file_size,
          download_url: signedData?.signedUrl || fileData.download_url,
        });

        return { ...msg, content: refreshedContent };
      } catch {
        return msg;
      }
    })
  );
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

    // Return in chronological order, with refreshed file URLs
    const chronological = data.reverse().map(formatMessage);
    const withFreshUrls = await refreshFileUrls(chronological);
    res.json(withFreshUrls);
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
