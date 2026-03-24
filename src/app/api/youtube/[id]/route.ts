import {
  getYoutubeVideoById,
  updateYoutubeVideo,
  deleteYoutubeVideo,
  ensureYoutubeSchema,
  YOUTUBE_STATUSES,
  type YoutubeVideoStatus,
} from '@/lib/youtube-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureYoutubeSchema().catch(() => {});
  const { id } = await params;
  const video = await getYoutubeVideoById(id);
  if (!video) return apiError('YouTube video not found', 404);
  return apiOk(video);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureYoutubeSchema().catch(() => {});
  const { id } = await params;
  const video = await getYoutubeVideoById(id);
  if (!video) return apiError('YouTube video not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const {
    title, status, topic, target_keyword, script_outline,
    description, tags, thumbnail_text, scheduled_date,
    published_at, youtube_url, views,
  } = body as Record<string, string | number | null | undefined>;

  // Validate status if provided
  if (status !== undefined && !YOUTUBE_STATUSES.includes(status as YoutubeVideoStatus)) {
    return apiError(`status must be one of: ${YOUTUBE_STATUSES.join(', ')}`);
  }

  // Validate tags JSON if provided
  if (tags !== undefined && tags !== null) {
    try {
      const parsed = JSON.parse(tags as string);
      if (!Array.isArray(parsed)) {
        return apiError('tags must be a JSON array string');
      }
    } catch {
      return apiError('tags must be a valid JSON array string');
    }
  }

  await updateYoutubeVideo(id, {
    title: title as string | undefined,
    status: status as string | undefined,
    topic: topic as string | undefined,
    target_keyword: target_keyword as string | undefined,
    script_outline: script_outline as string | undefined,
    description: description as string | undefined,
    tags: tags as string | undefined,
    thumbnail_text: thumbnail_text as string | undefined,
    scheduled_date: scheduled_date as string | null | undefined,
    published_at: published_at as number | null | undefined,
    youtube_url: youtube_url as string | null | undefined,
    views: views as number | undefined,
  });

  const updated = await getYoutubeVideoById(id);
  return apiOk(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureYoutubeSchema().catch(() => {});
  const { id } = await params;
  const video = await getYoutubeVideoById(id);
  if (!video) return apiError('YouTube video not found', 404);

  await deleteYoutubeVideo(id);
  return apiOk({ deleted: true });
}
