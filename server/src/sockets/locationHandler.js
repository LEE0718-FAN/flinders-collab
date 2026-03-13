const { supabaseAdmin } = require('../services/supabase');

async function verifyEventAccess(eventId, userId) {
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, room_id, enable_location_sharing')
    .eq('id', eventId)
    .maybeSingle();

  if (!event || !event.enable_location_sharing) {
    return null;
  }

  const { data: membership } = await supabaseAdmin
    .from('room_members')
    .select('id')
    .eq('room_id', event.room_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    return null;
  }

  return event;
}

/**
 * Handle location-sharing socket events for real-time updates.
 */
function locationHandler(io, socket) {
  const userId = socket.userId;

  /**
   * Join an event's location channel.
   * Client emits: 'location:join' { eventId }
   */
  socket.on('location:join', async ({ eventId }) => {
    if (!eventId) return;
    try {
      const event = await verifyEventAccess(eventId, userId);
      if (!event) {
        return socket.emit('location:error', { error: 'Not allowed to view this event location' });
      }
    } catch {
      return socket.emit('location:error', { error: 'Failed to verify event access' });
    }
    socket.join(`event-location:${eventId}`);
    console.log(`User ${userId} joined location channel for event:${eventId}`);
  });

  /**
   * Leave an event's location channel.
   * Client emits: 'location:leave' { eventId }
   */
  socket.on('location:leave', ({ eventId }) => {
    if (!eventId) return;
    socket.leave(`event-location:${eventId}`);
  });

  /**
   * Broadcast location update to other event participants.
   * Client emits: 'location:update' { eventId, latitude, longitude, status }
   * Server broadcasts to event channel: 'location:update' { userId, latitude, longitude, status }
   */
  socket.on('location:update', async ({ eventId, latitude, longitude, status }) => {
    if (!eventId || latitude == null || longitude == null) return;

    try {
      const event = await verifyEventAccess(eventId, userId);
      if (!event) {
        return socket.emit('location:error', { error: 'Not allowed to share location for this event' });
      }
    } catch (err) {
      console.error('Error verifying event participation:', err.message);
      return socket.emit('location:error', { error: 'Failed to verify participation' });
    }

    // Broadcast to all users watching this event's locations
    io.to(`event-location:${eventId}`).emit('location:update', {
      userId,
      latitude,
      longitude,
      status: status || 'on_the_way',
      updated_at: new Date().toISOString(),
    });
  });

  /**
   * Notify others that user stopped sharing.
   * Client emits: 'location:stop' { eventId }
   */
  socket.on('location:stop', async ({ eventId }) => {
    if (!eventId) return;
    try {
      const event = await verifyEventAccess(eventId, userId);
      if (!event) return;
    } catch {
      return;
    }

    io.to(`event-location:${eventId}`).emit('location:stopped', {
      userId,
    });
  });
}

module.exports = locationHandler;
