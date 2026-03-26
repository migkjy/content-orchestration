import { createClient } from '@libsql/client/web';

function getContentDb(dbUrl?: string, dbToken?: string) {
  const url = dbUrl ?? process.env.CONTENT_OS_DB_URL!;
  const authToken = dbToken ?? process.env.CONTENT_OS_DB_TOKEN!;
  return createClient({ url, authToken });
}

// === SNS Post Statuses ===
export const SNS_STATUSES = [
  'draft',
  'approved',
  'scheduled',
  'published',
] as const;
export type SnsPostStatus = (typeof SNS_STATUSES)[number];

// === SNS Platforms ===
export const SNS_PLATFORMS = [
  'instagram',
  'linkedin',
  'twitter',
] as const;
export type SnsPlatform = (typeof SNS_PLATFORMS)[number];

// === Interface ===
export interface SnsPost {
  id: string;
  platform: SnsPlatform;
  title: string;
  status: SnsPostStatus;
  content_brief: string | null;
  scheduled_date: string | null;  // ISO date string e.g. '2026-04-01'
  published_at: number | null;    // epoch ms
  post_url: string | null;
  engagement_count: number;
  created_at: number;             // epoch ms
  updated_at: number;             // epoch ms
}

// === Schema ===
export async function ensureSnsSchema(dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sns_posts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      content_brief TEXT,
      scheduled_date TEXT,
      published_at INTEGER,
      post_url TEXT,
      engagement_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).catch(() => {});
}

// === CRUD Functions ===

export async function getSnsPosts(
  platform?: string,
  status?: string,
  dbUrl?: string,
  dbToken?: string,
): Promise<SnsPost[]> {
  const db = getContentDb(dbUrl, dbToken);

  let sql = 'SELECT * FROM sns_posts';
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (platform && SNS_PLATFORMS.includes(platform as SnsPlatform)) {
    conditions.push('platform = ?');
    args.push(platform);
  }
  if (status && SNS_STATUSES.includes(status as SnsPostStatus)) {
    conditions.push('status = ?');
    args.push(status);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC LIMIT 200';

  const result = await db.execute({ sql, args });
  return result.rows as unknown as SnsPost[];
}

export async function getSnsPostById(
  id: string,
  dbUrl?: string,
  dbToken?: string,
): Promise<SnsPost | null> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM sns_posts WHERE id = ? LIMIT 1',
    args: [id],
  });
  return result.rows[0] ? (result.rows[0] as unknown as SnsPost) : null;
}

export async function createSnsPost(data: {
  platform: string;
  title: string;
  status?: string;
  content_brief?: string;
  scheduled_date?: string;
}, dbUrl?: string, dbToken?: string): Promise<string> {
  const db = getContentDb(dbUrl, dbToken);
  const id = crypto.randomUUID();
  const now = Date.now();
  const status = data.status && SNS_STATUSES.includes(data.status as SnsPostStatus)
    ? data.status
    : 'draft';

  await db.execute({
    sql: `INSERT INTO sns_posts
          (id, platform, title, status, content_brief, scheduled_date, engagement_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    args: [
      id,
      data.platform,
      data.title,
      status,
      data.content_brief ?? null,
      data.scheduled_date ?? null,
      now,
      now,
    ],
  });
  return id;
}

export async function updateSnsPost(id: string, data: {
  platform?: string;
  title?: string;
  status?: string;
  content_brief?: string;
  scheduled_date?: string | null;
  published_at?: number | null;
  post_url?: string | null;
  engagement_count?: number;
}, dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  const now = Date.now();
  const sets: string[] = ['updated_at = ?'];
  const args: (string | number | null)[] = [now];

  if (data.platform !== undefined && SNS_PLATFORMS.includes(data.platform as SnsPlatform)) {
    sets.push('platform = ?'); args.push(data.platform);
  }
  if (data.title !== undefined) { sets.push('title = ?'); args.push(data.title); }
  if (data.status !== undefined && SNS_STATUSES.includes(data.status as SnsPostStatus)) {
    sets.push('status = ?'); args.push(data.status);
  }
  if (data.content_brief !== undefined) { sets.push('content_brief = ?'); args.push(data.content_brief); }
  if (data.scheduled_date !== undefined) { sets.push('scheduled_date = ?'); args.push(data.scheduled_date); }
  if (data.published_at !== undefined) { sets.push('published_at = ?'); args.push(data.published_at); }
  if (data.post_url !== undefined) { sets.push('post_url = ?'); args.push(data.post_url); }
  if (data.engagement_count !== undefined) { sets.push('engagement_count = ?'); args.push(data.engagement_count); }

  args.push(id);
  await db.execute({ sql: `UPDATE sns_posts SET ${sets.join(', ')} WHERE id = ?`, args });
}

export async function deleteSnsPost(
  id: string,
  dbUrl?: string,
  dbToken?: string,
): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute({ sql: 'DELETE FROM sns_posts WHERE id = ?', args: [id] });
}
