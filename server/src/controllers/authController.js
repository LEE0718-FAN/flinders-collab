const { supabaseAdmin, supabasePublic } = require('../services/supabase');
const { ensureUserProfile } = require('../services/userProfile');
const { isUniversityEmail } = require('../utils/validators');
const config = require('../config');

function getConfiguredClientOrigins() {
  return String(process.env.CLIENT_URL || config.clientUrl || '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function getRequestClientOrigin(req) {
  const directOrigin = String(req.get('origin') || '').trim().replace(/\/$/, '');
  if (directOrigin) return directOrigin;

  const referer = String(req.get('referer') || '').trim();
  if (!referer) return '';

  try {
    return new URL(referer).origin.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function resolvePasswordResetBaseUrl(req) {
  const requestOrigin = getRequestClientOrigin(req);

  // Trust the request origin first (Supabase allowlist provides security)
  if (requestOrigin) return requestOrigin;

  const configuredOrigins = getConfiguredClientOrigins();
  const preferredConfiguredOrigin = configuredOrigins.find((origin) => {
    if (!/^https?:\/\//.test(origin)) return false;
    return !origin.includes('localhost') && !origin.includes('127.0.0.1');
  });
  if (preferredConfiguredOrigin) return preferredConfiguredOrigin;

  const fallbackConfiguredOrigin = configuredOrigins.find((origin) => /^https?:\/\//.test(origin));
  if (fallbackConfiguredOrigin) return fallbackConfiguredOrigin;

  return 'http://localhost:5173';
}

async function ignoreQueryError(query) {
  try {
    await query;
  } catch {
    // Best-effort cleanup path.
  }
}

/**
 * POST /auth/signup
 * Register a new user with Supabase Auth and create a profile.
 */
async function signup(req, res, next) {
  try {
    const { password, full_name, student_id, major, university, account_type } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    const normalizedAccountType = account_type || 'flinders';
    const normalizedMajor = String(major || '').trim() || null;
    const normalizedUniversity = normalizedAccountType === 'general'
      ? (String(university || '').trim() || null)
      : 'Flinders University';

    // Flinders students must use university email
    if (normalizedAccountType !== 'general' && !isUniversityEmail(email)) {
      return res.status(400).json({
        error: 'Must use a Flinders University email address',
      });
    }

    if (normalizedAccountType === 'general' && !normalizedUniversity) {
      return res.status(400).json({ error: 'University name is required for other-university accounts' });
    }

    if (!normalizedMajor) {
      return res.status(400).json({ error: 'Major or degree program is required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // auto-confirm for MVP
        user_metadata: {
          full_name,
          student_id: normalizedAccountType === 'flinders' ? student_id : null,
          major: normalizedMajor,
          university: normalizedUniversity,
          account_type: normalizedAccountType,
        },
      });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Insert profile into users table
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      university_email: email,
      student_id: normalizedAccountType === 'flinders' ? student_id : null,
      full_name,
      major: normalizedMajor,
      university: normalizedUniversity,
      avatar_url: null,
    });

    if (profileError) {
      console.error('Profile insert error:', profileError.message);
      await ignoreQueryError(supabaseAdmin.auth.admin.deleteUser(authData.user.id));
      return res.status(500).json({ error: 'Failed to create user profile. Please try again.' });
    }

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        student_id: normalizedAccountType === 'flinders' ? student_id : null,
        major: normalizedMajor,
        university: normalizedUniversity,
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
    const password = req.body.password;
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Basic email format check
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const { data, error } =
      await supabasePublic.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!data?.session || !data?.user) {
      console.error('Login: signInWithPassword returned no session/user', { data });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await ensureUserProfile(data.user);

    // Fetch profile (admin status + avatar) from users table
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_admin, avatar_url, full_name, major, university')
      .eq('id', data.user.id)
      .single();

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
        full_name: profile?.full_name || data.user.user_metadata?.full_name,
        avatar_url: profile?.avatar_url || null,
        is_admin: profile?.is_admin || false,
        account_type: data.user.user_metadata?.account_type || 'flinders',
        major: profile?.major || data.user.user_metadata?.major || null,
        university: profile?.university || data.user.user_metadata?.university || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function refreshSession(req, res, next) {
  try {
    const refreshToken = String(req.body.refresh_token || '').trim();

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { data, error } = await supabasePublic.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ error: 'Unable to refresh session' });
    }

    await ensureUserProfile(data.user);

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_admin, avatar_url, full_name, major, university')
      .eq('id', data.user.id)
      .single();

    res.json({
      message: 'Session refreshed',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || data.user.user_metadata?.full_name,
        avatar_url: profile?.avatar_url || null,
        is_admin: profile?.is_admin || false,
        is_tester: Boolean(data.user.user_metadata?.is_tester),
        account_type: data.user.user_metadata?.account_type || 'flinders',
        major: profile?.major || data.user.user_metadata?.major || null,
        university: profile?.university || data.user.user_metadata?.university || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/password/reset
 * Send a password reset email via Supabase Auth.
 */
async function requestPasswordReset(req, res, next) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const redirectTo = `${resolvePasswordResetBaseUrl(req)}/reset-password`;
    const { error } = await supabasePublic.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'If an account exists for that email, a password reset link has been sent.',
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
        university: req.user.user_metadata?.university || null,
        avatar_url: null,
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getPreferences(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('room_order, flinders_interests, flinders_favorites, notification_preferences')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to load preferences' });
    }

    res.json({
      room_order: Array.isArray(data?.room_order) ? data.room_order : [],
      flinders_interests: Array.isArray(data?.flinders_interests) ? data.flinders_interests : [],
      flinders_favorites: Array.isArray(data?.flinders_favorites) ? data.flinders_favorites : [],
      notification_preferences: normalizeNotificationPreferences(data?.notification_preferences),
    });
  } catch (err) {
    next(err);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const userId = req.user.id;
    const updates = {};

    if (req.body.room_order !== undefined) {
      updates.room_order = Array.isArray(req.body.room_order) ? req.body.room_order.filter((value) => typeof value === 'string') : [];
    }

    if (req.body.flinders_interests !== undefined) {
      updates.flinders_interests = Array.isArray(req.body.flinders_interests)
        ? req.body.flinders_interests.filter((value) => typeof value === 'string')
        : [];
    }

    if (req.body.flinders_favorites !== undefined) {
      updates.flinders_favorites = Array.isArray(req.body.flinders_favorites)
        ? req.body.flinders_favorites.filter((value) => typeof value === 'string')
        : [];
    }

    if (req.body.notification_preferences !== undefined) {
      updates.notification_preferences = normalizeNotificationPreferences(req.body.notification_preferences);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No preference updates provided' });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('room_order, flinders_interests, flinders_favorites, notification_preferences')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    res.json({
      room_order: Array.isArray(data?.room_order) ? data.room_order : [],
      flinders_interests: Array.isArray(data?.flinders_interests) ? data.flinders_interests : [],
      flinders_favorites: Array.isArray(data?.flinders_favorites) ? data.flinders_favorites : [],
      notification_preferences: normalizeNotificationPreferences(data?.notification_preferences),
    });
  } catch (err) {
    next(err);
  }
}

function normalizeNotificationPreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    chat: source.chat !== false,
    tasks: source.tasks !== false,
    schedule: source.schedule !== false,
    files: source.files !== false,
    announcements: source.announcements !== false,
    board: source.board !== false,
    room_updates: source.room_updates !== false,
  };
}

/**
 * PATCH /auth/me
 * Update the current user's profile (name and/or avatar).
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { full_name } = req.body;
    const updates = {};

    // Update name if provided
    if (full_name && full_name.trim()) {
      updates.full_name = full_name.trim();

      // Also update Supabase auth metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...req.user.user_metadata,
          full_name: updates.full_name,
        },
      });
    }

    // Handle avatar upload
    if (req.file) {
      const fileExt = req.file.originalname.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // Ensure avatars bucket exists
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      if (!buckets?.find((b) => b.name === 'avatars')) {
        await supabaseAdmin.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
        });
      }

      // Upload to avatars bucket
      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error('Avatar upload error:', uploadError.message);
        return res.status(500).json({ error: 'Failed to upload avatar' });
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(filePath);

      updates.avatar_url = urlData.publicUrl;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Update users table
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error.message);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/guest
 * Create a temporary tester account, sign in, and return session.
 */
async function guestLogin(req, res, next) {
  try {
    const uuid = require('crypto').randomUUID();
    const email = `tester-${uuid}@flinders.edu.au`;
    const password = `guest-${uuid}-${Date.now()}`;

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Tester', is_tester: true },
      });

    if (authError) {
      return res.status(500).json({ error: 'Failed to create tester account' });
    }

    try {
      await ensureUserProfile({
        id: authData.user.id,
        email,
        user_metadata: authData.user.user_metadata,
      });
    } catch (profileError) {
      await ignoreQueryError(supabaseAdmin.auth.admin.deleteUser(authData.user.id));
      console.error('Guest profile creation failed:', profileError.message);
      return res.status(500).json({ error: 'Failed to prepare tester account. Please try again.' });
    }

    // Sign in to get session
    const { data: loginData, error: loginError } =
      await supabasePublic.auth.signInWithPassword({ email, password });

    if (loginError || !loginData?.session) {
      // Clean up the created user
      await ignoreQueryError(supabaseAdmin.auth.admin.deleteUser(authData.user.id));
      console.error('Guest sign-in failed:', loginError?.message || 'No session returned');
      return res.status(500).json({ error: 'Failed to create tester session. Please try again.' });
    }

    res.json({
      session: {
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token,
        expires_at: loginData.session.expires_at,
      },
      user: {
        id: authData.user.id,
        email,
        full_name: 'Tester',
        is_tester: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/guest/cleanup
 * Delete the current tester account and all associated data.
 */
async function guestCleanup(req, res, next) {
  try {
    const userId = req.user.id;

    // Verify this is actually a tester account (check auth metadata)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!authUser?.user?.user_metadata?.is_tester) {
      return res.status(403).json({ error: 'Not a tester account' });
    }

    // Delete user's rooms (and cascade to room_members, events, tasks, etc.)
    const { data: ownedRooms } = await supabaseAdmin
      .from('room_members')
      .select('room_id')
      .eq('user_id', userId)
      .eq('role', 'owner');

    if (ownedRooms?.length) {
      for (const r of ownedRooms) {
        await ignoreQueryError(supabaseAdmin.from('rooms').delete().eq('id', r.room_id));
      }
    }

    // Remove from any rooms as member
    await ignoreQueryError(supabaseAdmin.from('room_members').delete().eq('user_id', userId));

    // Delete tasks assigned to or created by this user
    await ignoreQueryError(supabaseAdmin.from('tasks').delete().eq('assigned_to', userId));
    await ignoreQueryError(supabaseAdmin.from('tasks').delete().eq('created_by', userId));

    // Delete user profile
    await ignoreQueryError(supabaseAdmin.from('users').delete().eq('id', userId));

    // Delete from Supabase Auth
    await ignoreQueryError(supabaseAdmin.auth.admin.deleteUser(userId));

    res.json({ message: 'Tester account cleaned up' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  refreshSession,
  requestPasswordReset,
  logout,
  getMe,
  getPreferences,
  updatePreferences,
  updateProfile,
  guestLogin,
  guestCleanup,
};
