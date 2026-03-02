import { getChannels, createChannel, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

const VALID_PLATFORMS = ['instagram', 'youtube', 'newsletter', 'blog', 'facebook', 'x'];

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const channels = await getChannels();
  return apiOk(channels);
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

  const { name, platform, account_name, connection_type, connection_status, connection_detail } = body as Record<string, string | undefined>;

  if (!name || typeof name !== 'string') return apiError('name is required');
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return apiError(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`);
  }

  const id = await createChannel({
    name,
    platform,
    account_name,
    connection_type,
    connection_status,
    connection_detail,
  });

  return apiOk({ id }, 201);
}
