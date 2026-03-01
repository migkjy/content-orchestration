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
  title: string | null;
  content_body: string | null;
  status: string;
  priority: number;
  result_id: string | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
  scheduled_at: number | null;
  channel: string | null;
  project: string | null;
  approved_by: string | null;
  approved_at: number | null;
  rejected_reason: string | null;
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

// --- Analytics aggregate queries ---

export interface DailyPublishStat {
  day: string;
  content_type: string;
  count: number;
}

export interface PillarStat {
  pillar: string;
  status: string;
  count: number;
}

export interface PipelineEfficiency {
  pipeline_name: string;
  runs: number;
  success: number;
  failed: number;
  avg_duration: number;
  total_items: number;
}

export interface ErrorTrend {
  component: string;
  error_type: string;
  count: number;
  auto_fixed: number;
}

export interface ChannelPerformance {
  channel_id: string;
  name: string;
  platform: string;
  status: string;
  count: number;
}

export interface WeeklySummary {
  this_week: { published: number; collected: number; errors: number };
  last_week: { published: number; collected: number; errors: number };
}

export async function getDailyPublishStats(days: number = 30): Promise<DailyPublishStat[]> {
  const db = getContentDb();
  const cutoff = Date.now() - days * 86400000;
  const result = await db.execute({
    sql: `SELECT date(published_at/1000, 'unixepoch') as day, content_type, COUNT(*) as count
          FROM content_logs WHERE published_at >= ? GROUP BY day, content_type ORDER BY day`,
    args: [cutoff],
  });
  return result.rows.map((r) => ({
    day: String(r.day),
    content_type: String(r.content_type),
    count: Number(r.count),
  }));
}

export async function getPillarDistribution(): Promise<PillarStat[]> {
  const db = getContentDb();
  const result = await db.execute({
    sql: `SELECT pillar, status, COUNT(*) as count FROM content_queue
          WHERE pillar IS NOT NULL GROUP BY pillar, status`,
    args: [],
  });
  return result.rows.map((r) => ({
    pillar: String(r.pillar),
    status: String(r.status),
    count: Number(r.count),
  }));
}

export async function getPipelineEfficiency(days: number = 30): Promise<PipelineEfficiency[]> {
  const db = getContentDb();
  const cutoff = Date.now() - days * 86400000;
  const result = await db.execute({
    sql: `SELECT pipeline_name,
            COUNT(*) as runs,
            SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed,
            AVG(duration_ms) as avg_duration,
            SUM(items_processed) as total_items
          FROM pipeline_logs WHERE created_at >= ? GROUP BY pipeline_name`,
    args: [cutoff],
  });
  return result.rows.map((r) => ({
    pipeline_name: String(r.pipeline_name),
    runs: Number(r.runs),
    success: Number(r.success),
    failed: Number(r.failed),
    avg_duration: Number(r.avg_duration) || 0,
    total_items: Number(r.total_items) || 0,
  }));
}

export async function getErrorTrends(days: number = 30): Promise<ErrorTrend[]> {
  const db = getContentDb();
  const cutoff = Date.now() - days * 86400000;
  try {
    const result = await db.execute({
      sql: `SELECT component, error_type, COUNT(*) as count,
              SUM(CASE WHEN auto_fix_result='success' THEN 1 ELSE 0 END) as auto_fixed
            FROM error_logs WHERE occurred_at >= ? GROUP BY component, error_type`,
      args: [cutoff],
    });
    return result.rows.map((r) => ({
      component: String(r.component),
      error_type: String(r.error_type),
      count: Number(r.count),
      auto_fixed: Number(r.auto_fixed),
    }));
  } catch {
    return [];
  }
}

export async function getChannelPerformance(): Promise<ChannelPerformance[]> {
  const db = getContentDb();
  try {
    const result = await db.execute({
      sql: `SELECT cd.channel_id, COALESCE(c.name, cd.channel_id) as name,
              COALESCE(c.platform, 'unknown') as platform,
              cd.platform_status as status, COUNT(*) as count
            FROM content_distributions cd LEFT JOIN channels c ON cd.channel_id = c.id
            GROUP BY cd.channel_id, cd.platform_status`,
      args: [],
    });
    return result.rows.map((r) => ({
      channel_id: String(r.channel_id),
      name: String(r.name),
      platform: String(r.platform),
      status: String(r.status),
      count: Number(r.count),
    }));
  } catch {
    return [];
  }
}

export async function getWeeklySummary(): Promise<WeeklySummary> {
  const db = getContentDb();
  const now = Date.now();
  const oneWeekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;

  const empty = { published: 0, collected: 0, errors: 0 };

  try {
    const [pubThis, pubLast, colThis, colLast] = await Promise.all([
      db.execute({ sql: 'SELECT COUNT(*) as c FROM content_logs WHERE published_at >= ?', args: [oneWeekAgo] }),
      db.execute({ sql: 'SELECT COUNT(*) as c FROM content_logs WHERE published_at >= ? AND published_at < ?', args: [twoWeeksAgo, oneWeekAgo] }),
      db.execute({ sql: 'SELECT COUNT(*) as c FROM collected_news WHERE created_at >= ?', args: [oneWeekAgo] }),
      db.execute({ sql: 'SELECT COUNT(*) as c FROM collected_news WHERE created_at >= ? AND created_at < ?', args: [twoWeeksAgo, oneWeekAgo] }),
    ]);

    let errThis = 0, errLast = 0;
    try {
      const [eThis, eLast] = await Promise.all([
        db.execute({ sql: 'SELECT COUNT(*) as c FROM error_logs WHERE occurred_at >= ?', args: [oneWeekAgo] }),
        db.execute({ sql: 'SELECT COUNT(*) as c FROM error_logs WHERE occurred_at >= ? AND occurred_at < ?', args: [twoWeeksAgo, oneWeekAgo] }),
      ]);
      errThis = Number(eThis.rows[0]?.c) || 0;
      errLast = Number(eLast.rows[0]?.c) || 0;
    } catch {
      // error_logs table may not exist yet
    }

    return {
      this_week: {
        published: Number(pubThis.rows[0]?.c) || 0,
        collected: Number(colThis.rows[0]?.c) || 0,
        errors: errThis,
      },
      last_week: {
        published: Number(pubLast.rows[0]?.c) || 0,
        collected: Number(colLast.rows[0]?.c) || 0,
        errors: errLast,
      },
    };
  } catch {
    return { this_week: { ...empty }, last_week: { ...empty } };
  }
}

export async function getContentQueueFull(
  project?: string,
  status?: string,
  channel?: string,
  dbUrl?: string,
  dbToken?: string
): Promise<ContentQueueItem[]> {
  const db = getContentDb(dbUrl, dbToken);
  let query = `SELECT id, type, pillar, topic, title, content_body, status, priority,
    channel, project, approved_by, approved_at, rejected_reason,
    created_at, updated_at, scheduled_at
    FROM content_queue`;
  const conditions: string[] = [];
  const args: string[] = [];

  if (project && project !== 'all') {
    conditions.push('project = ?');
    args.push(project);
  }
  if (status) {
    conditions.push('status = ?');
    args.push(status);
  }
  if (channel) {
    conditions.push('channel = ?');
    args.push(channel);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC LIMIT 100';

  const result = await db.execute({ sql: query, args });
  return result.rows as unknown as ContentQueueItem[];
}

export async function updateContentStatus(
  id: string,
  status: string,
  options?: {
    approved_by?: string;
    rejected_reason?: string;
    scheduled_at?: number;
  },
  dbUrl?: string,
  dbToken?: string
): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  const now = Date.now();
  let query = 'UPDATE content_queue SET status = ?, updated_at = ?';
  const args: (string | number | null)[] = [status, now];

  if (status === 'approved' && options?.approved_by) {
    query += ', approved_by = ?, approved_at = ?';
    args.push(options.approved_by, now);
  }
  if (status === 'rejected' && options?.rejected_reason) {
    query += ', rejected_reason = ?';
    args.push(options.rejected_reason);
  }
  if (status === 'scheduled' && options?.scheduled_at) {
    query += ', scheduled_at = ?';
    args.push(options.scheduled_at);
  }

  query += ' WHERE id = ?';
  args.push(id);
  await db.execute({ sql: query, args });
}
