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
ALTER TABLE board_posts ADD COLUMN IF NOT EXISTS anonymous_poll BOOLEAN DEFAULT false;

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
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'poll_votes_delete') THEN
  CREATE POLICY "poll_votes_delete" ON poll_votes FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;

-- Add FK to public.users for PostgREST joins (auth.users FK is not visible to PostgREST)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'board_posts_author_users_fkey' AND table_name = 'board_posts') THEN
    ALTER TABLE board_posts ADD CONSTRAINT board_posts_author_users_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_author_users_fkey' AND table_name = 'comments') THEN
    ALTER TABLE comments ADD CONSTRAINT comments_author_users_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'poll_votes_user_users_fkey' AND table_name = 'poll_votes') THEN
    ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_user_users_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Task assignees table (multi-assignee support)
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- Make assigned_to nullable for multi-assignee tasks
ALTER TABLE tasks ALTER COLUMN assigned_to DROP NOT NULL;

-- RLS for task_assignees
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'task_assignees_select') THEN
  CREATE POLICY "task_assignees_select" ON task_assignees FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN room_members rm ON rm.room_id = t.room_id AND rm.user_id = auth.uid()
      WHERE t.id = task_assignees.task_id
    )
  );
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'task_assignees_insert') THEN
  CREATE POLICY "task_assignees_insert" ON task_assignees FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN room_members rm ON rm.room_id = t.room_id AND rm.user_id = auth.uid()
      WHERE t.id = task_assignees.task_id
    )
  );
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'task_assignees_update') THEN
  CREATE POLICY "task_assignees_update" ON task_assignees FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks t
      JOIN room_members rm ON rm.room_id = t.room_id AND rm.user_id = auth.uid()
      WHERE t.id = task_assignees.task_id AND rm.role IN ('owner', 'admin')
    )
  );
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'task_assignees_delete') THEN
  CREATE POLICY "task_assignees_delete" ON task_assignees FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN room_members rm ON rm.room_id = t.room_id AND rm.user_id = auth.uid()
      WHERE t.id = task_assignees.task_id AND rm.role IN ('owner', 'admin')
    )
  );
END IF;
END $$;

-- FK to public.users for PostgREST joins on task_assignees
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'task_assignees_user_users_fkey' AND table_name = 'task_assignees') THEN
    ALTER TABLE task_assignees ADD CONSTRAINT task_assignees_user_users_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Room announcements
CREATE TABLE IF NOT EXISTS room_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_announcements_room ON room_announcements(room_id);

-- Announcement reads (tracks who has read which announcement)
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES room_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE room_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_announcements_select') THEN
  CREATE POLICY "room_announcements_select" ON room_announcements FOR SELECT USING (
    EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = room_announcements.room_id AND rm.user_id = auth.uid())
  );
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_announcements_insert') THEN
  CREATE POLICY "room_announcements_insert" ON room_announcements FOR INSERT WITH CHECK (auth.uid() = author_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'room_announcements_delete') THEN
  CREATE POLICY "room_announcements_delete" ON room_announcements FOR DELETE USING (auth.uid() = author_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'announcement_reads_select') THEN
  CREATE POLICY "announcement_reads_select" ON announcement_reads FOR SELECT USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'announcement_reads_insert') THEN
  CREATE POLICY "announcement_reads_insert" ON announcement_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
END IF;
END $$;

-- FK to public.users for PostgREST joins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'room_announcements_author_users_fkey' AND table_name = 'room_announcements') THEN
    ALTER TABLE room_announcements ADD CONSTRAINT room_announcements_author_users_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Cached Flinders events (auto-crawled daily)
CREATE TABLE IF NOT EXISTS flinders_events_cache (
  id SERIAL PRIMARY KEY,
  wp_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  link TEXT,
  image TEXT,
  event_date TIMESTAMPTZ,
  categories TEXT[] DEFAULT '{}',
  raw_json JSONB,
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flinders_events_date ON flinders_events_cache(event_date);

-- Add location, time, cost columns to events cache
ALTER TABLE flinders_events_cache ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE flinders_events_cache ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE flinders_events_cache ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE flinders_events_cache ADD COLUMN IF NOT EXISTS cost TEXT;
ALTER TABLE flinders_events_cache ADD COLUMN IF NOT EXISTS time_display TEXT;
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
