import { getContentById, updateContent, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const content = await getContentById(id);
  if (!content) return apiError('Content not found', 404);
  return apiOk(content);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const content = await getContentById(id);
  if (!content) return apiError('Content not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const { title, content_body, pillar, channel, metadata } = body as Record<string, string | undefined>;

  await updateContent(id, {
    title,
    content_body,
    pillar,
    channel,
    metadata,
  });

  const updated = await getContentById(id);
  return apiOk(updated);
}
