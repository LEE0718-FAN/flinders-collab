-- ============================================================
-- 003: Location & File Hardening
-- ============================================================
-- Adds schema-level safeguards for event time ranges,
-- location session freshness, and file metadata integrity.

-- ============================================================
-- 1. Ensure event end_time is always after start_time
-- ============================================================
ALTER TABLE events
  ADD CONSTRAINT chk_events_time_range CHECK (end_time > start_time);

-- ============================================================
-- 2. Location session freshness index
--    Speeds up the "active, non-stale sessions" query used by
--    getLocationStatus (filters on event_id + status + updated_at).
-- ============================================================
CREATE INDEX idx_location_sessions_active
  ON location_sessions (event_id, status, updated_at DESC)
  WHERE status <> 'stopped';

-- ============================================================
-- 3. File metadata: default file_size to 0 when not provided
--    and add a CHECK to prevent negative sizes.
-- ============================================================
ALTER TABLE files
  ALTER COLUMN file_size SET DEFAULT 0;

ALTER TABLE files
  ADD CONSTRAINT chk_files_size_non_negative CHECK (file_size >= 0 OR file_size IS NULL);

-- ============================================================
-- 4. Storage policy: allow room admins/owners to delete files
--    (original policy only allowed the uploader to delete).
-- ============================================================
CREATE POLICY "room_files_delete_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'room-files'
    AND auth.uid() IN (
      SELECT rm.user_id FROM room_members rm
      JOIN rooms r ON r.id = rm.room_id
      WHERE rm.role IN ('owner', 'admin')
      AND r.id::text = (storage.foldername(name))[2]
    )
  );
