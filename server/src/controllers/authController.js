const { supabaseAdmin, supabasePublic } = require('../services/supabase');
const { ensureUserProfile } = require('../services/userProfile');
const { isUniversityEmail } = require('../utils/validators');

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
    const { password, full_name, student_id, major, account_type } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    // Flinders students must use university email
    if (account_type !== 'general' && !isUniversityEmail(email)) {
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
        user_metadata: { full_name, student_id, major, account_type: account_type || 'flinders' },
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

    // Fetch profile (admin status + avatar) from users table
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_admin, avatar_url, full_name')
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
  logout,
  getMe,
  updateProfile,
  guestLogin,
  guestCleanup,
};
