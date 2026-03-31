-- ============================================================
-- 011: Supabase Pro Features
-- Realtime, pg_cron cleanup, storage optimizations
-- ============================================================

-- 1. Enable Realtime on campus presence & friend requests
-- This allows clients to subscribe to INSERT/UPDATE/DELETE via Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE flinders_campus_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE flinders_friend_requests;

-- 2. Set REPLICA IDENTITY FULL so Realtime sends old + new row on UPDATE/DELETE
ALTER TABLE flinders_campus_presence REPLICA IDENTITY FULL;
ALTER TABLE flinders_friend_requests REPLICA IDENTITY FULL;

-- 3. Enable pg_cron extension (Pro plan)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 4. Scheduled cleanup: stale campus presence (older than 8 hours)
-- Runs every 3 hours
SELECT cron.schedule(
  'cleanup-stale-presence',
  '0 */3 * * *',
  $$DELETE FROM flinders_campus_presence WHERE updated_at < now() - interval '8 hours'$$
);

-- 5. Scheduled cleanup: stopped location sessions older than 24h
-- Runs daily at 4:00 AM UTC (2:30 PM ACDT)
SELECT cron.schedule(
  'cleanup-stopped-locations',
  '0 4 * * *',
  $$DELETE FROM location_sessions WHERE status = 'stopped' AND updated_at < now() - interval '24 hours'$$
);

-- 6. Scheduled cleanup: old system messages (> 30 days)
-- Runs daily at 4:15 AM UTC
SELECT cron.schedule(
  'cleanup-old-system-messages',
  '15 4 * * *',
  $$DELETE FROM messages WHERE message_type = 'system' AND created_at < now() - interval '30 days'$$
);

-- 7. Scheduled cleanup: old cached Flinders events (> 60 days)
-- Runs weekly on Sunday at 5:00 AM UTC
SELECT cron.schedule(
  'cleanup-old-cached-events',
  '0 5 * * 0',
  $$DELETE FROM flinders_events_cache WHERE event_date < now() - interval '60 days'$$
);

-- 8. Scheduled cleanup: expired deadline reminders (> 7 days past)
-- Runs daily at 4:30 AM UTC
SELECT cron.schedule(
  'cleanup-old-reminders',
  '30 4 * * *',
  $$DELETE FROM deadline_reminders WHERE reminder_date < CURRENT_DATE - interval '7 days'$$
);

-- 9. Weekly ANALYZE to keep query planner stats fresh
-- Runs Sunday at 5:30 AM UTC
SELECT cron.schedule(
  'weekly-analyze',
  '30 5 * * 0',
  $$ANALYZE$$
);

-- 10. RLS policies for Realtime subscriptions on campus presence
-- Authenticated users can see all shared presence (already enforced by sharing_enabled filter in app)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'flinders_campus_presence' AND policyname = 'realtime_select_presence'
  ) THEN
    CREATE POLICY realtime_select_presence ON flinders_campus_presence
      FOR SELECT TO authenticated
      USING (sharing_enabled = true);
  END IF;
END $$;

-- Enable RLS on the table if not already
ALTER TABLE flinders_campus_presence ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own presence
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'flinders_campus_presence' AND policyname = 'own_presence_all'
  ) THEN
    CREATE POLICY own_presence_all ON flinders_campus_presence
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
