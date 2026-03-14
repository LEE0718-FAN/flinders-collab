const config = require('../config');

const MIGRATION_SQL = `
-- Add academic info columns to users table (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_level INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS semester INTEGER;

-- Board posts table
CREATE TABLE IF NOT EXISTS board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_board_posts_author ON board_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_board_posts_category ON board_posts(category);
CREATE INDEX IF NOT EXISTS idx_board_posts_created ON board_posts(created_at DESC);

-- Board participations
CREATE TABLE IF NOT EXISTS board_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('join', 'pass')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_board_participations_post ON board_participations(post_id);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL DEFAULT 'board_post',
  target_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);

-- RLS
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'board_posts_select') THEN
  CREATE POLICY "board_posts_select" ON board_posts FOR SELECT USING (auth.uid() IS NOT NULL);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'board_posts_insert') THEN
  CREATE POLICY "board_posts_insert" ON board_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'board_posts_update') THEN
  CREATE POLICY "board_posts_update" ON board_posts FOR UPDATE USING (auth.uid() = author_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'board_posts_delete') THEN
  CREATE POLICY "board_posts_delete" ON board_posts FOR DELETE USING (auth.uid() = author_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'board_participations_select') THEN
  CREATE POLICY "board_participations_select" ON board_participations FOR SELECT USING (auth.uid() IS NOT NULL);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'board_participations_insert') THEN
  CREATE POLICY "board_participations_insert" ON board_participations FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'board_participations_update') THEN
  CREATE POLICY "board_participations_update" ON board_participations FOR UPDATE USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'board_participations_delete') THEN
  CREATE POLICY "board_participations_delete" ON board_participations FOR DELETE USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_select') THEN
  CREATE POLICY "comments_select" ON comments FOR SELECT USING (auth.uid() IS NOT NULL);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_insert') THEN
  CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comments_delete') THEN
  CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = author_id);
END IF;
END $$;
`;

async function runMigration() {
  const url = config.supabase.url;
  const key = config.supabase.serviceRoleKey;

  if (!url || !key) {
    console.log('[migrate] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, skipping migration');
    return;
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });

    // Try using the SQL endpoint via pg-meta (Supabase internal API)
    const sqlRes = await fetch(`${url}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ query: MIGRATION_SQL }),
    });

    if (sqlRes.ok) {
      console.log('[migrate] Board migration applied successfully');
      return;
    }

    // Fallback: try individual statements via supabase admin
    console.log('[migrate] pg/query not available, trying individual checks...');
    await ensureTablesExist(url, key);
  } catch (err) {
    console.log('[migrate] Migration check:', err.message || 'Could not auto-apply migration');
    console.log('[migrate] If board features fail, please run the SQL in supabase/migrations/008_board_and_comments.sql via Supabase Dashboard SQL Editor');
  }
}

async function ensureTablesExist(url, key) {
  const { supabaseAdmin } = require('../services/supabase');

  // Test if board_posts table exists
  const { error } = await supabaseAdmin.from('board_posts').select('id').limit(1);
  if (error && error.message.includes('does not exist')) {
    console.log('[migrate] board_posts table missing. Please run: supabase/migrations/008_board_and_comments.sql');
    console.log('[migrate] Go to Supabase Dashboard → SQL Editor → paste the migration SQL');
  } else {
    console.log('[migrate] Board tables verified');
  }
}

module.exports = { runMigration };
