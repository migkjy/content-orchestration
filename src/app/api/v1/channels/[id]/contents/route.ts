import { getChannelById, getChannelContents, getCampaigns, ensureSchema } from '@/lib/content-db';
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

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const campaignIdFilter = searchParams.get('campaign_id');

  let contents = await getChannelContents(id);
  if (statusFilter) contents = contents.filter(c => c.status === statusFilter);
  if (campaignIdFilter) contents = contents.filter(c => c.campaign_id === campaignIdFilter);

  // 캠페인 정보 join
  const campaigns = await getCampaigns();
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  const enriched = contents.map(c => ({
    ...c,
    campaign_info: c.campaign_id ? campaignMap[c.campaign_id] ?? null : null,
  }));

  // 프로젝트별 그룹핑
  const grouped: Record<string, typeof enriched> = {};
  for (const item of enriched) {
    const key = item.campaign_id ?? 'uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  return apiOk({
    channel,
    contents: enriched,
    grouped_by_campaign: grouped,
    total: enriched.length,
  });
}
