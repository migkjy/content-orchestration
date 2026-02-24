import { createClient } from '@libsql/client/web';

function getContentDb(dbUrl?: string, dbToken?: string) {
  const url = dbUrl ?? process.env.CONTENT_OS_DB_URL!;
  const authToken = dbToken ?? process.env.CONTENT_OS_DB_TOKEN!;
  return createClient({ url, authToken });
}

export interface Newsletter {
  id: string;
  subject: string;
  html_content: string;
  plain_content: string | null;
  status: string;
  email_service_id: string | null;
  sent_at: number | null;
  created_at: number;
}

export interface ContentQueueItem {
  id: string;
  type: string;
  pillar: string | null;
  topic: string | null;
  status: string;
  priority: number;
  result_id: string | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
  scheduled_at: number | null;
  channel: string | null;
  project: string | null;
}

export interface ContentLog {
  id: string;
  content_type: string;
  content_id: string | null;
  title: string | null;
  platform: string | null;
  status: string;
  metrics: string | null;
  published_at: number;
  created_at: number;
}

export interface PipelineLog {
  id: string;
  pipeline_name: string;
  status: string;
  duration_ms: number | null;
  items_processed: number;
  error_message: string | null;
  metadata: string | null;
  created_at: number;
}

export interface NewsSource {
  source: string;
  total: number;
  latest_at: number | null;
}

export async function ensureSchema(dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute(`ALTER TABLE content_queue ADD COLUMN scheduled_at INTEGER`).catch(() => {});
  await db.execute(`ALTER TABLE content_queue ADD COLUMN channel TEXT`).catch(() => {});
  await db.execute(`ALTER TABLE content_queue ADD COLUMN project TEXT`).catch(() => {});
}

export async function getNewsletters(dbUrl?: string, dbToken?: string): Promise<Newsletter[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT id, subject, status, sent_at, created_at FROM newsletters ORDER BY created_at DESC LIMIT 50',
    args: [],
  });
  return result.rows as unknown as Newsletter[];
}

export async function getNewsletterById(id: string, dbUrl?: string, dbToken?: string): Promise<Newsletter | null> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM newsletters WHERE id = ? LIMIT 1',
    args: [id],
  });
  return result.rows[0] ? (result.rows[0] as unknown as Newsletter) : null;
}

export async function updateNewsletterStatus(id: string, status: string, dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute({
    sql: 'UPDATE newsletters SET status = ? WHERE id = ?',
    args: [status, id],
  });
}

export async function getContentQueue(dbUrl?: string, dbToken?: string): Promise<ContentQueueItem[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM content_queue ORDER BY priority DESC, created_at DESC LIMIT 100',
    args: [],
  });
  return result.rows as unknown as ContentQueueItem[];
}

export async function getScheduledContent(dbUrl?: string, dbToken?: string): Promise<ContentQueueItem[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM content_queue WHERE scheduled_at IS NOT NULL ORDER BY scheduled_at ASC LIMIT 200',
    args: [],
  });
  return result.rows as unknown as ContentQueueItem[];
}

export async function getContentLogs(dbUrl?: string, dbToken?: string): Promise<ContentLog[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM content_logs ORDER BY published_at DESC LIMIT 50',
    args: [],
  });
  return result.rows as unknown as ContentLog[];
}

export async function getPipelineLogs(dbUrl?: string, dbToken?: string): Promise<PipelineLog[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM pipeline_logs ORDER BY created_at DESC LIMIT 30',
    args: [],
  });
  return result.rows as unknown as PipelineLog[];
}

export async function getRssSourceStats(dbUrl?: string, dbToken?: string): Promise<NewsSource[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT source, COUNT(*) as total, MAX(created_at) as latest_at FROM collected_news GROUP BY source ORDER BY total DESC',
    args: [],
  });
  return result.rows as unknown as NewsSource[];
}

export async function getNewsStats(dbUrl?: string, dbToken?: string): Promise<{ total: number; used: number; unused: number }> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as total, SUM(used_in_newsletter) as used FROM collected_news',
    args: [],
  });
  const row = result.rows[0] as unknown as { total: number; used: number };
  return {
    total: Number(row.total) || 0,
    used: Number(row.used) || 0,
    unused: (Number(row.total) || 0) - (Number(row.used) || 0),
  };
}

export interface PlfScheduleItem {
  id: string;
  content_type: string;
  title: string;
  slug_or_file: string | null;
  channel: string | null;
  scheduled_week: string | null;
  scheduled_day: string | null;
  status: string;
  created_at: number;
}

export async function ensurePlfScheduleTable(dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute(
    `CREATE TABLE IF NOT EXISTS plf_schedule (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      title TEXT NOT NULL,
      slug_or_file TEXT,
      channel TEXT,
      scheduled_week TEXT,
      scheduled_day TEXT,
      status TEXT DEFAULT 'draft',
      created_at INTEGER DEFAULT (unixepoch()*1000)
    )`
  ).catch(() => {});
}

export async function getPlfSchedule(dbUrl?: string, dbToken?: string): Promise<PlfScheduleItem[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM plf_schedule ORDER BY scheduled_week ASC, created_at ASC',
    args: [],
  });
  return result.rows as unknown as PlfScheduleItem[];
}
