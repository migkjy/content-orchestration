import { getChannelById, updateChannel, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const channel = await getChannelById(id);
  if (!channel) return apiError('Channel not found', 404);
  return apiOk(channel);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const channel = await getChannelById(id);
  if (!channel) return apiError('Channel not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  await updateChannel(id, body as Parameters<typeof updateChannel>[1]);
  const updated = await getChannelById(id);
  return apiOk(updated);
}
