const { supabaseAdmin } = require('../services/supabase');

/**
 * POST /rooms/:roomId/events
 * Create a new event in a room.
 */
async function createEvent(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      category,
      location_name,
      start_time,
      end_time,
      enable_location_sharing,
    } = req.body;

    // Validate time range
    if (new Date(end_time) <= new Date(start_time)) {
      return res.status(400).json({
        error: 'End time must be after start time',
      });
    }

    // Location sharing requires a location name
    if (enable_location_sharing && !location_name) {
      return res.status(400).json({
        error: 'Location name is required when location sharing is enabled',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({
        room_id: roomId,
        title,
        description: description || null,
        category: category || 'other',
        location_name: location_name || null,
        start_time,
        end_time,
        created_by: userId,
        enable_location_sharing: enable_location_sharing || false,
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
 * GET /rooms/:roomId/events
 * List all events in a room, optionally filtered by date range.
 */
async function getEvents(req, res, next) {
  try {
    const { roomId } = req.params;
    const { from, to } = req.query;

    let query = supabaseAdmin
      .from('events')
      .select('*')
      .eq('room_id', roomId)
      .order('start_time', { ascending: true });

    if (from) {
      query = query.gte('start_time', from);
    }
    if (to) {
      query = query.lte('start_time', to);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /events/:eventId
 * Update an existing event. Only owner/admin or event creator can update.
 */
async function updateEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Fetch the event to check ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is the creator or has admin/owner role on the room
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', existing.room_id)
      .eq('user_id', userId)
      .single();

    const isCreator = existing.created_by === userId;
    const isAdmin =
      membership && (membership.role === 'owner' || membership.role === 'admin');

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        error: 'Only the event creator or room admin can update this event',
      });
    }

    // Build update object from allowed fields
    const allowedFields = [
      'title',
      'description',
      'category',
      'location_name',
      'start_time',
      'end_time',
      'enable_location_sharing',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Validate time range: use provided values or fall back to existing
    const effectiveStart = updates.start_time || existing.start_time;
    const effectiveEnd = updates.end_time || existing.end_time;
    if (new Date(effectiveEnd) <= new Date(effectiveStart)) {
      return res.status(400).json({
        error: 'End time must be after start time',
      });
    }

    // If enabling location sharing, ensure location name exists
    const effectiveLocationSharing =
      updates.enable_location_sharing !== undefined
        ? updates.enable_location_sharing
        : existing.enable_location_sharing;
    const effectiveLocationName =
      updates.location_name !== undefined
        ? updates.location_name
        : existing.location_name;
    if (effectiveLocationSharing && !effectiveLocationName) {
      return res.status(400).json({
        error: 'Location name is required when location sharing is enabled',
      });
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /events/:eventId
 * Delete an event. Only owner/admin or event creator can delete.
 */
async function deleteEvent(req, res, next) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    const { data: membership } = await supabaseAdmin
      .from('room_members')
      .select('role')
      .eq('room_id', existing.room_id)
      .eq('user_id', userId)
      .single();

    const isCreator = existing.created_by === userId;
    const isAdmin =
      membership && (membership.role === 'owner' || membership.role === 'admin');

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        error: 'Only the event creator or room admin can delete this event',
      });
    }

    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
};
