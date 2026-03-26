import {
  getSnsPostById,
  updateSnsPost,
  deleteSnsPost,
  ensureSnsSchema,
  SNS_STATUSES,
  SNS_PLATFORMS,
  type SnsPostStatus,
  type SnsPlatform,
} from '@/lib/sns-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSnsSchema().catch(() => {});
  const { id } = await params;
  const post = await getSnsPostById(id);
  if (!post) return apiError('SNS post not found', 404);
  return apiOk(post);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSnsSchema().catch(() => {});
  const { id } = await params;
  const post = await getSnsPostById(id);
  if (!post) return apiError('SNS post not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const {
    platform, title, status, content_brief,
    scheduled_date, published_at, post_url, engagement_count,
  } = body as Record<string, string | number | null | undefined>;

  // Validate platform if provided
  if (platform !== undefined && !SNS_PLATFORMS.includes(platform as SnsPlatform)) {
    return apiError(`platform must be one of: ${SNS_PLATFORMS.join(', ')}`);
  }

  // Validate status if provided
  if (status !== undefined && !SNS_STATUSES.includes(status as SnsPostStatus)) {
    return apiError(`status must be one of: ${SNS_STATUSES.join(', ')}`);
  }

  await updateSnsPost(id, {
    platform: platform as string | undefined,
    title: title as string | undefined,
    status: status as string | undefined,
    content_brief: content_brief as string | undefined,
    scheduled_date: scheduled_date as string | null | undefined,
    published_at: published_at as number | null | undefined,
    post_url: post_url as string | null | undefined,
    engagement_count: engagement_count as number | undefined,
  });

  const updated = await getSnsPostById(id);
  return apiOk(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSnsSchema().catch(() => {});
  const { id } = await params;
  const post = await getSnsPostById(id);
  if (!post) return apiError('SNS post not found', 404);

  await deleteSnsPost(id);
  return apiOk({ deleted: true });
}
