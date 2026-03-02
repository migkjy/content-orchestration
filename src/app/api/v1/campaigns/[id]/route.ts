import { getCampaignById, updateCampaign, ensureSchema, getCampaignContentStats } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return apiError('Campaign not found', 404);

  const stats = await getCampaignContentStats(id);
  return apiOk({ ...campaign, stats });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return apiError('Campaign not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  await updateCampaign(id, body as Parameters<typeof updateCampaign>[1]);
  const updated = await getCampaignById(id);
  return apiOk(updated);
}
