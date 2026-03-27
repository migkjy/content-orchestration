import { createClient } from '@libsql/client/web';

function getContentDb(dbUrl?: string, dbToken?: string) {
  const url = dbUrl ?? process.env.CONTENT_OS_DB_URL!;
  const authToken = dbToken ?? process.env.CONTENT_OS_DB_TOKEN!;
  return createClient({ url, authToken });
}

// === YouTube Video Statuses ===
export const YOUTUBE_STATUSES = [
  'draft',
  'scripting',
  'filming',
  'editing',
  'review',
  'published',
] as const;
export type YoutubeVideoStatus = (typeof YOUTUBE_STATUSES)[number];

// === Interface ===
export interface YoutubeVideo {
  id: string;
  title: string;
  status: YoutubeVideoStatus;
  topic: string | null;
  target_keyword: string | null;
  script_outline: string | null;
  description: string | null;
  tags: string | null;            // JSON array string e.g. '["AI","자동화"]'
  thumbnail_text: string | null;
  scheduled_date: string | null;  // ISO date string e.g. '2026-04-01'
  published_at: number | null;    // epoch ms
  youtube_url: string | null;
  views: number;
  created_at: number;             // epoch ms
  updated_at: number;             // epoch ms
}

// === Schema ===
export async function ensureYoutubeSchema(dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS youtube_videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      topic TEXT,
      target_keyword TEXT,
      script_outline TEXT,
      description TEXT,
      tags TEXT,
      thumbnail_text TEXT,
      scheduled_date TEXT,
      published_at INTEGER,
      youtube_url TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).catch(() => {});
}

// === CRUD Functions ===

export async function getYoutubeVideos(
  status?: string,
  dbUrl?: string,
  dbToken?: string,
): Promise<YoutubeVideo[]> {
  const db = getContentDb(dbUrl, dbToken);

  let sql = 'SELECT * FROM youtube_videos';
  const args: (string | number)[] = [];

  if (status && YOUTUBE_STATUSES.includes(status as YoutubeVideoStatus)) {
    sql += ' WHERE status = ?';
    args.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT 200';

  const result = await db.execute({ sql, args });
  return result.rows as unknown as YoutubeVideo[];
}

export async function getYoutubeVideoById(
  id: string,
  dbUrl?: string,
  dbToken?: string,
): Promise<YoutubeVideo | null> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM youtube_videos WHERE id = ? LIMIT 1',
    args: [id],
  });
  return result.rows[0] ? (result.rows[0] as unknown as YoutubeVideo) : null;
}

export async function createYoutubeVideo(data: {
  title: string;
  status?: string;
  topic?: string;
  target_keyword?: string;
  script_outline?: string;
  description?: string;
  tags?: string;
  thumbnail_text?: string;
  scheduled_date?: string;
}, dbUrl?: string, dbToken?: string): Promise<string> {
  const db = getContentDb(dbUrl, dbToken);
  const id = crypto.randomUUID();
  const now = Date.now();
  const status = data.status && YOUTUBE_STATUSES.includes(data.status as YoutubeVideoStatus)
    ? data.status
    : 'draft';

  await db.execute({
    sql: `INSERT INTO youtube_videos
          (id, title, status, topic, target_keyword, script_outline, description, tags, thumbnail_text, scheduled_date, views, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    args: [
      id,
      data.title,
      status,
      data.topic ?? null,
      data.target_keyword ?? null,
      data.script_outline ?? null,
      data.description ?? null,
      data.tags ?? null,
      data.thumbnail_text ?? null,
      data.scheduled_date ?? null,
      now,
      now,
    ],
  });
  return id;
}

export async function updateYoutubeVideo(id: string, data: {
  title?: string;
  status?: string;
  topic?: string;
  target_keyword?: string;
  script_outline?: string;
  description?: string;
  tags?: string;
  thumbnail_text?: string;
  scheduled_date?: string | null;
  published_at?: number | null;
  youtube_url?: string | null;
  views?: number;
}, dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  const now = Date.now();

  // Auto-set published_at when status transitions to 'published' and no explicit value provided
  if (data.status === 'published' && data.published_at === undefined) {
    data.published_at = now;
  }

  const sets: string[] = ['updated_at = ?'];
  const args: (string | number | null)[] = [now];

  if (data.title !== undefined) { sets.push('title = ?'); args.push(data.title); }
  if (data.status !== undefined && YOUTUBE_STATUSES.includes(data.status as YoutubeVideoStatus)) {
    sets.push('status = ?'); args.push(data.status);
  }
  if (data.topic !== undefined) { sets.push('topic = ?'); args.push(data.topic); }
  if (data.target_keyword !== undefined) { sets.push('target_keyword = ?'); args.push(data.target_keyword); }
  if (data.script_outline !== undefined) { sets.push('script_outline = ?'); args.push(data.script_outline); }
  if (data.description !== undefined) { sets.push('description = ?'); args.push(data.description); }
  if (data.tags !== undefined) { sets.push('tags = ?'); args.push(data.tags); }
  if (data.thumbnail_text !== undefined) { sets.push('thumbnail_text = ?'); args.push(data.thumbnail_text); }
  if (data.scheduled_date !== undefined) { sets.push('scheduled_date = ?'); args.push(data.scheduled_date); }
  if (data.published_at !== undefined) { sets.push('published_at = ?'); args.push(data.published_at); }
  if (data.youtube_url !== undefined) { sets.push('youtube_url = ?'); args.push(data.youtube_url); }
  if (data.views !== undefined) { sets.push('views = ?'); args.push(data.views); }

  args.push(id);
  await db.execute({ sql: `UPDATE youtube_videos SET ${sets.join(', ')} WHERE id = ?`, args });
}

export async function deleteYoutubeVideo(
  id: string,
  dbUrl?: string,
  dbToken?: string,
): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute({ sql: 'DELETE FROM youtube_videos WHERE id = ?', args: [id] });
}
