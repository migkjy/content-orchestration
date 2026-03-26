import {
  getSnsPosts,
  createSnsPost,
  ensureSnsSchema,
  SNS_STATUSES,
  SNS_PLATFORMS,
  type SnsPostStatus,
  type SnsPlatform,
} from '@/lib/sns-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSnsSchema().catch(() => {});
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const posts = await getSnsPosts(platform, status);
  return apiOk({ posts, total: posts.length });
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSnsSchema().catch(() => {});

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const { platform, title, status, content_brief, scheduled_date } =
    body as Record<string, string | undefined>;

  if (!platform || typeof platform !== 'string') {
    return apiError('platform is required');
  }
  if (!SNS_PLATFORMS.includes(platform as SnsPlatform)) {
    return apiError(`platform must be one of: ${SNS_PLATFORMS.join(', ')}`);
  }

  if (!title || typeof title !== 'string') {
    return apiError('title is required');
  }

  // Validate status if provided
  if (status && !SNS_STATUSES.includes(status as SnsPostStatus)) {
    return apiError(`status must be one of: ${SNS_STATUSES.join(', ')}`);
  }

  const id = await createSnsPost({
    platform,
    title,
    status,
    content_brief,
    scheduled_date,
  });

  return apiOk({ id }, 201);
}
