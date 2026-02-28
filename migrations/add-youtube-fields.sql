-- YouTube metadata fields for collected_news table
-- Adds platform-specific fields to support YouTube RSS entries
-- Run manually after VP/CEO approval (drizzle-kit push 금지)

-- Add platform column to distinguish RSS vs YouTube vs SNS sources
ALTER TABLE collected_news ADD COLUMN platform TEXT DEFAULT 'rss';

-- YouTube-specific metadata
ALTER TABLE collected_news ADD COLUMN video_id TEXT;
ALTER TABLE collected_news ADD COLUMN channel_id TEXT;
ALTER TABLE collected_news ADD COLUMN thumbnail_url TEXT;
ALTER TABLE collected_news ADD COLUMN video_url TEXT;
ALTER TABLE collected_news ADD COLUMN duration TEXT;

-- Index for faster YouTube content queries
CREATE INDEX IF NOT EXISTS idx_collected_news_platform ON collected_news(platform);
CREATE INDEX IF NOT EXISTS idx_collected_news_video_id ON collected_news(video_id);
