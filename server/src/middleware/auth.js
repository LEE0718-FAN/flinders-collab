const { supabaseAdmin } = require('../services/supabase');

/**
 * Authentication middleware.
 * Verifies the Supabase JWT from the Authorization header
 * and attaches the user object to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.split(' ')[1];

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: 'Invalid or expired token',
      });
    }

    // Attach user and token to request
    req.user = data.user;
    req.accessToken = token;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({
      error: 'Authentication failed',
    });
  }
}

/**
 * Room membership middleware.
 * Checks that the authenticated user is a member of the room
 * specified by req.params.roomId.
 */
async function requireRoomMember(req, res, next) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('room_members')
      .select('id, role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(403).json({
        error: 'You are not a member of this room',
      });
    }

    req.memberRole = data.role;
    next();
  } catch (err) {
    console.error('Room member check error:', err.message);
    return res.status(500).json({
      error: 'Failed to verify room membership',
    });
  }
}

/**
 * Room admin/owner middleware.
 * Must be used after requireRoomMember.
 */
function requireRoomAdmin(req, res, next) {
  if (req.memberRole !== 'owner' && req.memberRole !== 'admin') {
    return res.status(403).json({
      error: 'Admin or owner access required',
    });
  }
  next();
}

module.exports = {
  authenticate,
  requireRoomMember,
  requireRoomAdmin,
};
