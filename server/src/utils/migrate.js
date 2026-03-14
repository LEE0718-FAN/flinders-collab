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

-- Add anonymous flag to board_posts
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- Add poll columns to board_posts
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS poll_options JSONB DEFAULT NULL;

-- Post reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('fire', 'heart', 'laugh', 'clap', 'think')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON poll_votes(post_id);

-- RLS for new tables
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'post_reactions_select') THEN
  CREATE POLICY "post_reactions_select" ON post_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'post_reactions_insert') THEN
  CREATE POLICY "post_reactions_insert" ON post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'post_reactions_delete') THEN
  CREATE POLICY "post_reactions_delete" ON post_reactions FOR DELETE USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'poll_votes_select') THEN
  CREATE POLICY "poll_votes_select" ON poll_votes FOR SELECT USING (auth.uid() IS NOT NULL);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'poll_votes_insert') THEN
  CREATE POLICY "poll_votes_insert" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'poll_votes_update') THEN
  CREATE POLICY "poll_votes_update" ON poll_votes FOR UPDATE USING (auth.uid() = user_id);
END IF;
END $$;
`;

async function runMigration() {
  // Method 1: Supabase Management API (uses access token + project ref)
  const accessToken = config.supabaseAccessToken;
  const projectRef = config.supabaseProjectRef;

  if (accessToken && projectRef) {
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ query: MIGRATION_SQL }),
        }
      );

      if (res.ok) {
        console.log('[migrate] Migration applied via Supabase Management API');
        return;
      }

      const text = await res.text();
      console.log('[migrate] Management API response:', res.status, text.slice(0, 200));
    } catch (err) {
      console.log('[migrate] Management API failed:', err.message);
    }
  }

  // Method 2: Direct PostgreSQL connection
  const databaseUrl = config.databaseUrl;
  if (databaseUrl) {
    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
      });
      await client.connect();
      await client.query(MIGRATION_SQL);
      await client.end();
      console.log('[migrate] Migration applied via direct PostgreSQL connection');
      return;
    } catch (err) {
      console.log('[migrate] Direct PostgreSQL failed:', err.message);
    }
  }

  // Method 3: Fallback — verify tables exist
  const url = config.supabase.url;
  const key = config.supabase.serviceRoleKey;
  if (url && key) {
    try {
      const { supabaseAdmin } = require('../services/supabase');
      const { error } = await supabaseAdmin.from('board_posts').select('id').limit(1);
      if (error && error.message.includes('does not exist')) {
        console.log('[migrate] Tables missing — set SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF for auto-migration');
      } else {
        console.log('[migrate] Board tables verified');
      }
    } catch (err) {
      console.log('[migrate] Verification failed:', err.message);
    }
  }
}

module.exports = { runMigration };
