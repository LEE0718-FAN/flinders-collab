const { supabaseAdmin } = require('../services/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a short invite code for room joining.
 */
function generateInviteCode() {
  return uuidv4().split('-')[0].toUpperCase();
}

/**
 * POST /rooms
 * Create a new room and add the creator as owner.
 */
async function createRoom(req, res, next) {
  try {
    const { name, course_name, description } = req.body;
    const userId = req.user.id;
    const inviteCode = generateInviteCode();

    // Create the room
    const { data: room, error: roomError } = await supabaseAdmin
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
      return res.status(400).json({ error: roomError.message });
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
 * POST /rooms/:roomId/join
 * Join a room using an invite code.
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

module.exports = {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  getMembers,
};
