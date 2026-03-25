-- SNS Posts table for content-orchestration pipeline
-- Created: 2026-03-26
-- NOTE: Do NOT run via drizzle-kit push. Apply manually or via ensureSnsSchema().

CREATE TABLE IF NOT EXISTS sns_posts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,                            -- instagram | linkedin | twitter
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',               -- draft | approved | scheduled | published
  content_brief TEXT,                                 -- 콘텐츠 브리프 (markdown/text)
  scheduled_date TEXT,                                -- ISO date e.g. '2026-04-01'
  published_at INTEGER,                               -- epoch ms, 발행 시점
  post_url TEXT,                                      -- 발행 후 SNS URL
  engagement_count INTEGER NOT NULL DEFAULT 0,        -- 반응수 (좋아요+댓글+공유 등)
  created_at INTEGER NOT NULL,                        -- epoch ms
  updated_at INTEGER NOT NULL                         -- epoch ms
);

-- Index for platform + status filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_sns_posts_platform ON sns_posts(platform);
CREATE INDEX IF NOT EXISTS idx_sns_posts_status ON sns_posts(status);

-- Index for scheduled date ordering
CREATE INDEX IF NOT EXISTS idx_sns_posts_scheduled ON sns_posts(scheduled_date);
