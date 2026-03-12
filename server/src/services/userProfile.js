const { supabaseAdmin } = require('./supabase');

async function ensureUserProfile(authUser) {
  if (!authUser?.id || !authUser?.email) {
    return;
  }

  const fullName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
  const studentId = authUser.user_metadata?.student_id || null;
  const major = authUser.user_metadata?.major || null;
  const avatarUrl = authUser.user_metadata?.avatar_url || null;

  const { error } = await supabaseAdmin.from('users').upsert({
    id: authUser.id,
    university_email: authUser.email,
    student_id: studentId,
    full_name: fullName,
    major,
    avatar_url: avatarUrl,
  });

  if (error) {
    throw error;
  }
}

module.exports = {
  ensureUserProfile,
};
