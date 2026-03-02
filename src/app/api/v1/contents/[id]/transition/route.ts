import { getContentById, updateContentStatus, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

// 허용된 상태 전환 맵
const TRANSITIONS: Record<string, string[]> = {
  unwritten: ['draft', 'cancelled'],
  draft:     ['review', 'cancelled'],
  review:    ['approved', 'draft', 'cancelled'],    // approved = 승인, draft = 반려 후 재수정
  approved:  ['scheduled', 'draft', 'cancelled'],
  scheduled: ['published', 'approved', 'cancelled'],
  published: [],  // 종결 상태
  cancelled: ['draft'],  // 복구 가능
};

export async function POST(
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

  const { to, rejected_reason, scheduled_at, approved_by } = body as Record<string, string | number | undefined>;

  if (!to || typeof to !== 'string') return apiError('to (target status) is required');

  const currentStatus = content.status;
  const allowed = TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(to)) {
    return apiError(
      `Cannot transition from '${currentStatus}' to '${to}'. Allowed: [${allowed.join(', ')}]`,
      422
    );
  }

  // 상태별 추가 검증
  if (to === 'review' && !content.content_body) {
    return apiError('content_body is required before requesting review');
  }
  if (to === 'scheduled' && !scheduled_at) {
    return apiError('scheduled_at (Unix timestamp in ms) is required for scheduling');
  }

  await updateContentStatus(id, to, {
    approved_by: approved_by as string | undefined,
    rejected_reason: rejected_reason as string | undefined,
    scheduled_at: scheduled_at as number | undefined,
  });

  const updated = await getContentById(id);
  return apiOk({
    content: updated,
    transition: { from: currentStatus, to },
  });
}
