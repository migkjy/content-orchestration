import { getContentQueueFull, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';
import { createClient } from '@libsql/client/web';

function getDb() {
  return createClient({
    url: process.env.CONTENT_OS_DB_URL!,
    authToken: process.env.CONTENT_OS_DB_TOKEN!,
  });
}

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { searchParams } = new URL(request.url);

  const campaignId = searchParams.get('campaign_id') ?? undefined;
  const channelId = searchParams.get('channel_id') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const search = searchParams.get('q') ?? undefined;

  // getContentQueueFull은 project/status/channel/search 필터만 지원
  // campaign_id/channel_id는 직접 필터링
  let contents = await getContentQueueFull(undefined, status, undefined, search);

  if (campaignId) contents = contents.filter(c => c.campaign_id === campaignId);
  if (channelId) contents = contents.filter(c => c.channel_id === channelId);

  return apiOk({ contents, total: contents.length });
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const { title, campaign_id, channel_id, content_body, scheduled_at, status } = body as Record<string, string | number | undefined>;

  if (!title || typeof title !== 'string') return apiError('title is required');

  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const initialStatus = (status as string) || 'unwritten';

  // 유효 상태 검증
  const VALID_STATUSES = ['unwritten', 'draft', 'review', 'approved', 'scheduled', 'published', 'cancelled'];
  if (!VALID_STATUSES.includes(initialStatus)) {
    return apiError(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  await db.execute({
    sql: `INSERT INTO content_queue
          (id, type, title, content_body, status, priority, campaign_id, channel_id, scheduled_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      'content',
      title,
      (content_body as string) ?? null,
      initialStatus,
      0,
      (campaign_id as string) ?? null,
      (channel_id as string) ?? null,
      (scheduled_at as number) ?? null,
      now,
      now,
    ],
  });

  return apiOk({ id }, 201);
}
