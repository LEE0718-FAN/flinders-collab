const { supabaseAdmin } = require('../services/supabase');

/**
 * Generate a short invite code for room joining.
 * Uses an alphanumeric charset excluding visually ambiguous characters (0, O, 1, I).
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /rooms
 * Create a new room and add the creator as owner.
 * Retries up to 3 times if invite code collides with an existing one.
 */
async function createRoom(req, res, next) {
  try {
    const { name, course_name, description } = req.body;
    const userId = req.user.id;

    const MAX_RETRIES = 3;
    let room = null;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const inviteCode = generateInviteCode();

      const { data, error: roomError } = await supabaseAdmin
        .from('rooms')
        .insert({
          name,
          course_name: course_name || null,
          description: description || null,
          owner_id: userId,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (roomError) {
        // Check for unique constraint violation on invite_code
        if (
          roomError.code === '23505' &&
          roomError.message.includes('invite_code')
        ) {
          lastError = roomError;
          continue; // retry with a new code
        }
        return res.status(400).json({ error: roomError.message });
      }

      room = data;
      break;
    }

    if (!room) {
      return res.status(500).json({
        error: 'Failed to generate a unique invite code. Please try again.',
      });
    }

    // Add creator as owner member
    const { error: memberError } = await supabaseAdmin
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      console.error('Failed to add owner as member:', memberError.message);
    }

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /rooms
 * List all rooms the authenticated user is a member of.
 */
async function getRooms(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('room_members')
      .select(`
        role,
        joined_at,
        rooms (
          id,
          name,
          course_name,
          description,
          owner_id,
          invite_code,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const rooms = data.map((entry) => ({
      ...entry.rooms,
      my_role: entry.role,
      joined_at: entry.joined_at,
    }));

    res.json(rooms);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /rooms/:roomId
 * Get details of a specific room.
 */
async function getRoom(req, res, next) {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ ...data, my_role: req.memberRole });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /rooms/join
 * Join a room using only an invite code (no roomId required).
 */
async function joinRoomByCode(req, res, next) {
  try {
    const { invite_code } = req.body;
    const userId = req.user.id;

    // Look up room by invite code
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, course_name, description, owner_id, invite_code, created_at')
      .eq('invite_code', invite_code)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Invalid invite code. Please check and try again.' });
    }

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from('room_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You are already a member of this room' });
    }

    // Add as member
    const { data: membership, error: joinError } = await supabaseAdmin
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single();

    if (joinError) {
      return res.status(400).json({ error: joinError.message });
    }

    res.status(201).json({
      message: 'Joined room successfully',
      room,
      membership,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /rooms/:roomId/join
 * Join a room using an invite code (legacy route requiring roomId).
 */
async function joinRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const { invite_code } = req.body;
    const userId = req.user.id;

    // Verify invite code
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, invite_code')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.invite_code !== invite_code) {
      return res.status(400).json({ error: 'Invalid invite code' });
    }

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You are already a member of this room' });
    }

    // Add as member
    const { data: membership, error: joinError } = await supabaseAdmin
      .from('room_members')
      .insert({
        room_id: roomId,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single();

    if (joinError) {
      return res.status(400).json({ error: joinError.message });
    }

    res.status(201).json({
      message: 'Joined room successfully',
      membership,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /rooms/:roomId/members
 * List all members of a room.
 */
async function getMembers(req, res, next) {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('room_members')
      .select(`
        id,
        role,
        joined_at,
        users (
          id,
          full_name,
          university_email,
          avatar_url,
          major
        )
      `)
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const members = data.map((entry) => ({
      ...entry.users,
      role: entry.role,
      joined_at: entry.joined_at,
      membership_id: entry.id,
    }));

    res.json(members);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /rooms/:roomId
 * Delete a room. Only the room owner may delete it.
 */
async function deleteRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify the room exists and the user is the owner
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, owner_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the room owner can delete this room' });
    }

    // Delete room members first (foreign key constraint)
    const { error: membersDeleteError } = await supabaseAdmin
      .from('room_members')
      .delete()
      .eq('room_id', roomId);

    if (membersDeleteError) {
      console.error('Failed to delete room members:', membersDeleteError.message);
    }

    // Delete the room
    const { error: deleteError } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /rooms/:roomId
 * Update room details. Only owner can update.
 */
async function updateRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('owner_id')
      .eq('id', roomId)
      .single();

    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.owner_id !== userId) return res.status(403).json({ error: 'Only the room owner can edit this room' });

    const { name, description, course_name } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (course_name !== undefined) updates.course_name = course_name;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /rooms/:roomId/leave
 * Leave a room. Owners cannot leave (must delete or transfer ownership).
 */
async function leaveRoom(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Check if user is the owner
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('owner_id')
      .eq('id', roomId)
      .single();

    if (room && room.owner_id === userId) {
      return res.status(400).json({ error: 'Room owner cannot leave. Delete the room instead.' });
    }

    // Remove membership
    const { error } = await supabaseAdmin
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Left room successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  joinRoom,
  joinRoomByCode,
  getMembers,
  deleteRoom,
  leaveRoom,
};
