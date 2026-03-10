const { supabaseAdmin } = require('../services/supabase');

/**
 * POST /events/:eventId/location/start
 * Start sharing location for an event. Creates a location session.
 */
async function startSharing(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify event exists and has location sharing enabled
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.enable_location_sharing) {
      return res.status(400).json({
        error: 'Location sharing is not enabled for this event',
      });
    }

    // Verify user is a member of the event's room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('id')
      .eq('room_id', event.room_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'You are not a member of this room',
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

    const updates = {
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = status;
    }

    const { data, error } = await supabaseAdmin
      .from('location_sessions')
      .update(updates)
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
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

    const { data, error } = await supabaseAdmin
      .from('location_sessions')
      .update({
        status: 'stopped',
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
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

    // Verify user is a member of the event's room
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('room_id')
      .eq('id', eventId)
      .single();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('id')
      .eq('room_id', event.room_id)
      .eq('user_id', req.user.id)
      .single();

    if (!membership) {
      return res.status(403).json({
        error: 'You are not a member of this room',
      });
    }

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
