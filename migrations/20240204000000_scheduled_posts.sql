-- Migration: Create scheduled_posts table for InsForge Backend
-- This table stores pre-signed Nostr events that are scheduled for future publication
--
-- Note: This app uses Nostr authentication (npub/nip-07), not InsForge JWT auth.
-- RLS policies allow anon access with client-side pubkey filtering.

-- Create the scheduled_posts table
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_pubkey TEXT NOT NULL,
  kind INTEGER NOT NULL,
  signed_event JSONB NOT NULL,
  relays JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries (matching InsForge schema)
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for_status ON scheduled_posts(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status ON scheduled_posts(user_pubkey, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_kind ON scheduled_posts(kind);

-- Enable Row Level Security
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow anon access (Nostr auth is client-side)
DROP POLICY IF EXISTS "Allow anon access" ON scheduled_posts;
CREATE POLICY "Allow anon access" ON scheduled_posts
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow authenticated access (for edge functions)
DROP POLICY IF EXISTS "Allow authenticated access" ON scheduled_posts;
CREATE POLICY "Allow authenticated access" ON scheduled_posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow postgres access
DROP POLICY IF EXISTS "Allow postgres access" ON scheduled_posts;
CREATE POLICY "Allow postgres access" ON scheduled_posts
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Project admin full access
DROP POLICY IF EXISTS "project_admin_policy" ON scheduled_posts;
CREATE POLICY "project_admin_policy" ON scheduled_posts
  FOR ALL
  TO project_admin
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, postgres;
GRANT ALL ON scheduled_posts TO anon, authenticated, postgres;
