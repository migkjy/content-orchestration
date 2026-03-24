import {
  getYoutubeVideos,
  createYoutubeVideo,
  ensureYoutubeSchema,
  YOUTUBE_STATUSES,
  type YoutubeVideoStatus,
} from '@/lib/youtube-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureYoutubeSchema().catch(() => {});
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;

  const videos = await getYoutubeVideos(status);
  return apiOk({ videos, total: videos.length });
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureYoutubeSchema().catch(() => {});

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const { title, status, topic, target_keyword, script_outline, description, tags, thumbnail_text, scheduled_date } =
    body as Record<string, string | undefined>;

  if (!title || typeof title !== 'string') {
    return apiError('title is required');
  }

  // Validate status if provided
  if (status && !YOUTUBE_STATUSES.includes(status as YoutubeVideoStatus)) {
    return apiError(`status must be one of: ${YOUTUBE_STATUSES.join(', ')}`);
  }

  // Validate tags JSON if provided
  if (tags) {
    try {
      const parsed = JSON.parse(tags);
      if (!Array.isArray(parsed)) {
        return apiError('tags must be a JSON array string, e.g. \'["AI","YouTube"]\'');
      }
    } catch {
      return apiError('tags must be a valid JSON array string');
    }
  }

  const id = await createYoutubeVideo({
    title,
    status,
    topic,
    target_keyword,
    script_outline,
    description,
    tags,
    thumbnail_text,
    scheduled_date,
  });

  return apiOk({ id }, 201);
}
