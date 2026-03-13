const { saveMessage } = require('../controllers/messageController');
const { supabaseAdmin } = require('../services/supabase');

async function isRoomMember(roomId, userId) {
  const { data } = await supabaseAdmin
    .from('room_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * Handle chat-related socket events for a connected user.
 */
function chatHandler(io, socket) {
  const userId = socket.userId;

  /**
   * Join a room's chat channel.
   * Client emits: 'chat:join' { roomId }
   */
  socket.on('chat:join', async ({ roomId }) => {
    if (!roomId) return;
    try {
      const member = await isRoomMember(roomId, userId);
      if (!member) {
        return socket.emit('chat:error', { error: 'Not a room member' });
      }
    } catch (err) {
      return socket.emit('chat:error', { error: 'Failed to verify room access' });
    }
    socket.join(`room:${roomId}`);
    console.log(`User ${userId} joined chat room:${roomId}`);
  });

  /**
   * Leave a room's chat channel.
   * Client emits: 'chat:leave' { roomId }
   */
  socket.on('chat:leave', ({ roomId }) => {
    if (!roomId) return;
    socket.leave(`room:${roomId}`);
    console.log(`User ${userId} left chat room:${roomId}`);
  });

  /**
   * Send a message to a room.
   * Client emits: 'chat:message' { roomId, content, message_type? }
   * Server emits to room: 'chat:message' { message object }
   */
  socket.on('chat:message', async ({ roomId, content, message_type }) => {
    if (!roomId || !content) return;

    try {
      // Verify user is a member of the room
      if (!(await isRoomMember(roomId, userId))) {
        return socket.emit('chat:error', { error: 'Not a room member' });
      }

      const message = await saveMessage({
        room_id: roomId,
        user_id: userId,
        content: content.trim().substring(0, 5000),
        message_type: message_type || 'text',
      });

      // Broadcast to all users in the room (including sender)
      io.to(`room:${roomId}`).emit('chat:message', message);
    } catch (err) {
      console.error('Error saving message:', err.message);
      socket.emit('chat:error', { error: 'Failed to send message' });
    }
  });

  /**
   * Typing indicator.
   * Client emits: 'chat:typing' { roomId, isTyping }
   * Server broadcasts to room (except sender): 'chat:typing' { userId, isTyping }
   */
  socket.on('chat:typing', async ({ roomId, isTyping }) => {
    if (!roomId) return;
    try {
      if (!(await isRoomMember(roomId, userId))) {
        return;
      }
    } catch {
      return;
    }
    socket.to(`room:${roomId}`).emit('chat:typing', {
      userId,
      isTyping: !!isTyping,
    });
  });
}

module.exports = chatHandler;
