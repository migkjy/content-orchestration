import { getCampaigns, createCampaign, ensureSchema, getCampaignContentStats } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const campaigns = await getCampaigns();

  // 각 캠페인의 콘텐츠 통계 포함
  const withStats = await Promise.all(
    campaigns.map(async (c) => {
      const stats = await getCampaignContentStats(c.id);
      return { ...c, stats };
    })
  );

  return apiOk(withStats);
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

  const { name, description, goal, type, start_date, end_date } = body as Record<string, string | number | undefined>;
  if (!name || typeof name !== 'string') {
    return apiError('name is required');
  }

  const id = await createCampaign({
    name,
    description: description as string | undefined,
    goal: goal as string | undefined,
    type: (type as string) || 'campaign',
    start_date: start_date as number | undefined,
    end_date: end_date as number | undefined,
  });

  return apiOk({ id }, 201);
}
