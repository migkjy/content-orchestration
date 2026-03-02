CREATE TABLE IF NOT EXISTS content_sites (
  site TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  published_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_published_at INTEGER,
  last_synced_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 초기 데이터 시딩 (현재 수동 카운트 반영)
INSERT OR REPLACE INTO content_sites (site, display_name, published_count, is_active, last_synced_at, updated_at) VALUES
  ('apppro-kr',       'apppro.kr 블로그',        40, 1, unixepoch(), unixepoch()),
  ('koreaai-hub',     'KoreaAI Hub 블로그',       10, 1, unixepoch(), unixepoch()),
  ('richbukae',       'richbukae.com 블로그',      7, 1, unixepoch(), unixepoch()),
  ('ai-architect',    'AI Architect Global 블로그', 9, 1, unixepoch(), unixepoch()),
  ('prompt-shop',     'prompt-shop /guides',       3, 1, unixepoch(), unixepoch());
