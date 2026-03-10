/**
 * Handle location-sharing socket events for real-time updates.
 */
function locationHandler(io, socket) {
  const userId = socket.userId;

  /**
   * Join an event's location channel.
   * Client emits: 'location:join' { eventId }
   */
  socket.on('location:join', ({ eventId }) => {
    if (!eventId) return;
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
  socket.on('location:update', ({ eventId, latitude, longitude, status }) => {
    if (!eventId || latitude == null || longitude == null) return;

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
  socket.on('location:stop', ({ eventId }) => {
    if (!eventId) return;

    io.to(`event-location:${eventId}`).emit('location:stopped', {
      userId,
    });
  });
}

module.exports = locationHandler;
