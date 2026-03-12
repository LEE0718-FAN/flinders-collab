const { supabaseAdmin } = require('../services/supabase');
const config = require('../config');

/**
 * Helper: verify event exists, has location sharing enabled, and user is a room member.
 * Returns { event, membership } on success or sends an error response and returns null.
 */
async function verifyEventMembership(req, res, eventId, userId) {
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    res.status(404).json({ error: 'Event not found' });
    return null;
  }

  const { data: membership } = await supabaseAdmin
    .from('room_members')
    .select('id, role')
    .eq('room_id', event.room_id)
    .eq('user_id', userId)
    .single();

  if (!membership) {
    res.status(403).json({ error: 'You are not a member of this room' });
    return null;
  }

  return { event, membership };
}

/**
 * POST /events/:eventId/location/start
 * Start sharing location for an event. Creates a location session.
 */
async function startSharing(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await verifyEventMembership(req, res, eventId, userId);
    if (!result) return;
    const { event } = result;

    if (!event.enable_location_sharing) {
      return res.status(400).json({
        error: 'Location sharing is not enabled for this event',
      });
    }

    // Check if session already exists
    const { data: existingSession } = await supabaseAdmin
      .from('location_sessions')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (existingSession) {
      // Reactivate existing session
      const { data, error } = await supabaseAdmin
        .from('location_sessions')
        .update({ status: 'on_the_way', updated_at: new Date().toISOString() })
        .eq('id', existingSession.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json(data);
    }

    // Create new session
    const { data, error } = await supabaseAdmin
      .from('location_sessions')
      .insert({
        event_id: eventId,
        user_id: userId,
        latitude: null,
        longitude: null,
        status: 'on_the_way',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /events/:eventId/location/update
 * Update the user's current location for an event.
 */
async function updateLocation(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { latitude, longitude, status } = req.body;

    // Verify membership before allowing update
    const result = await verifyEventMembership(req, res, eventId, userId);
    if (!result) return;

    const updates = {
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = status;
    }

    // Only update sessions that are not stopped
    const { data, error } = await supabaseAdmin
      .from('location_sessions')
      .update(updates)
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .neq('status', 'stopped')
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'No active location session found. Start sharing first.',
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /events/:eventId/location/stop
 * Stop sharing location for an event.
 */
async function stopSharing(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify membership before allowing stop
    const result = await verifyEventMembership(req, res, eventId, userId);
    if (!result) return;

    // Only stop sessions that are not already stopped
    const { data, error } = await supabaseAdmin
      .from('location_sessions')
      .update({
        status: 'stopped',
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .neq('status', 'stopped')
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'No active location session found',
      });
    }

    res.json({ message: 'Location sharing stopped', session: data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /events/:eventId/location-status
 * Get all location sessions for an event (all members sharing).
 */
async function getLocationStatus(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await verifyEventMembership(req, res, eventId, userId);
    if (!result) return;

    // Calculate staleness cutoff
    const staleMinutes = config.location.staleSessionMinutes;
    const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('location_sessions')
      .select(`
        *,
        users:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .neq('status', 'stopped')
      .gte('updated_at', staleCutoff)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startSharing,
  updateLocation,
  stopSharing,
  getLocationStatus,
};
