-- YouTube Videos table for content-orchestration pipeline
-- Created: 2026-03-24
-- NOTE: Do NOT run via drizzle-kit push. Apply manually or via ensureYoutubeSchema().

CREATE TABLE IF NOT EXISTS youtube_videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',          -- draft | scripting | filming | editing | review | published
  topic TEXT,                                     -- 주제 (e.g. "AI 자동화 입문")
  target_keyword TEXT,                            -- SEO 메인 키워드
  script_outline TEXT,                            -- 스크립트 아웃라인 (markdown/text)
  description TEXT,                               -- YouTube 설명문
  tags TEXT,                                      -- JSON array string e.g. '["AI","자동화"]'
  thumbnail_text TEXT,                            -- 썸네일에 들어갈 텍스트
  scheduled_date TEXT,                            -- ISO date e.g. '2026-04-01'
  published_at INTEGER,                           -- epoch ms, 발행 시점
  youtube_url TEXT,                               -- 발행 후 YouTube URL
  views INTEGER NOT NULL DEFAULT 0,               -- 조회수 추적
  created_at INTEGER NOT NULL,                    -- epoch ms
  updated_at INTEGER NOT NULL                     -- epoch ms
);

-- Index for status-based filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_youtube_videos_status ON youtube_videos(status);

-- Index for scheduled date ordering
CREATE INDEX IF NOT EXISTS idx_youtube_videos_scheduled ON youtube_videos(scheduled_date);
