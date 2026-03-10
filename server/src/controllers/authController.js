const { supabaseAdmin } = require('../services/supabase');
const { isUniversityEmail } = require('../utils/validators');

/**
 * POST /auth/signup
 * Register a new user with Supabase Auth and create a profile.
 */
async function signup(req, res, next) {
  try {
    const { email, password, full_name, student_id, major } = req.body;

    // Double-check domain on server side
    if (!isUniversityEmail(email)) {
      return res.status(400).json({
        error: 'Must use a Flinders University email address',
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // auto-confirm for MVP
        user_metadata: { full_name, student_id, major },
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Insert profile into users table
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      university_email: email,
      student_id,
      full_name,
      major: major || null,
      avatar_url: null,
    });

    if (profileError) {
      console.error('Profile insert error:', profileError.message);
      // User was created in auth but profile failed — still return success
      // Profile can be created on first login
    }

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        student_id,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login
 * Sign in with email and password via Supabase Auth.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { data, error } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 * Sign out the current user (invalidates the session on Supabase).
 */
async function logout(req, res, next) {
  try {
    // Supabase admin can revoke sessions
    await supabaseAdmin.auth.admin.signOut(req.accessToken);

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/me
 * Get the current authenticated user's profile.
 */
async function getMe(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // Fallback to auth metadata if profile doesn't exist yet
      return res.json({
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.user_metadata?.full_name || null,
        student_id: req.user.user_metadata?.student_id || null,
        major: req.user.user_metadata?.major || null,
        avatar_url: null,
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  logout,
  getMe,
};
