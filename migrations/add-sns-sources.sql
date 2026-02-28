-- SNS bookmarks table for Threads / Instagram collection
-- Run manually after CEO provides API keys (drizzle-kit push 금지)

CREATE TABLE IF NOT EXISTS sns_bookmarks (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK(platform IN ('threads', 'instagram')),
  external_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  author TEXT,
  media_url TEXT,
  saved_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  synced_at INTEGER
);

-- Prevent duplicate bookmarks per platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_sns_bookmarks_platform_external
  ON sns_bookmarks(platform, external_id);

-- Query by platform
CREATE INDEX IF NOT EXISTS idx_sns_bookmarks_platform
  ON sns_bookmarks(platform);

-- Query by save time
CREATE INDEX IF NOT EXISTS idx_sns_bookmarks_saved_at
  ON sns_bookmarks(saved_at);
