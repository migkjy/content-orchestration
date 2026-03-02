import { getTopics, createTopic, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});

  const { searchParams } = new URL(request.url);
  const pillar = searchParams.get('pillar') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const content_type = searchParams.get('content_type') ?? undefined;

  const topics = await getTopics({ pillar, status, content_type });
  return apiOk({ topics, total: topics.length });
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

  const { pillar, title, description, content_type, priority, source, tags, prompt_hint } = body;

  if (!pillar || typeof pillar !== 'string') return apiError('pillar is required');
  if (!title || typeof title !== 'string') return apiError('title is required');
  if (!content_type || typeof content_type !== 'string') return apiError('content_type is required');

  const id = await createTopic({
    pillar,
    title,
    description: typeof description === 'string' ? description : undefined,
    content_type,
    priority: typeof priority === 'number' ? priority : 0,
    source: typeof source === 'string' ? source : 'manual',
    tags: typeof tags === 'string' ? tags : undefined,
    prompt_hint: typeof prompt_hint === 'string' ? prompt_hint : undefined,
  });

  return apiOk({ id }, 201);
}
