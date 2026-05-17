-- Add publish system columns to polls
ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;

-- Backfill: existing polls become visible immediately (publish_at = created_at which is already past)
UPDATE polls SET publish_at = created_at WHERE publish_at IS NULL;
