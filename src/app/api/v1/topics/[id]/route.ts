import { getTopicById, updateTopic, deleteTopic, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const { id } = await params;
  await ensureSchema().catch(() => {});

  const topic = await getTopicById(id);
  if (!topic) return apiError('Topic not found', 404);
  return apiOk({ topic });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const { id } = await params;
  await ensureSchema().catch(() => {});

  const topic = await getTopicById(id);
  if (!topic) return apiError('Topic not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  await updateTopic(id, {
    title: typeof body.title === 'string' ? body.title : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    pillar: typeof body.pillar === 'string' ? body.pillar : undefined,
    content_type: typeof body.content_type === 'string' ? body.content_type : undefined,
    status: typeof body.status === 'string' ? body.status : undefined,
    priority: typeof body.priority === 'number' ? body.priority : undefined,
    tags: typeof body.tags === 'string' ? body.tags : undefined,
    prompt_hint: typeof body.prompt_hint === 'string' ? body.prompt_hint : undefined,
  });

  const updated = await getTopicById(id);
  return apiOk({ topic: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const { id } = await params;
  const topic = await getTopicById(id);
  if (!topic) return apiError('Topic not found', 404);

  await deleteTopic(id);
  return apiOk({ deleted: true });
}
