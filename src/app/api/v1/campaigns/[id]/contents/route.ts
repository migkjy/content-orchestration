import { getCampaignById, getCampaignContents, getChannels, ensureSchema } from '@/lib/content-db';
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

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const channelIdFilter = searchParams.get('channel_id');

  let contents = await getCampaignContents(id);

  if (statusFilter) {
    contents = contents.filter(c => c.status === statusFilter);
  }
  if (channelIdFilter) {
    contents = contents.filter(c => c.channel_id === channelIdFilter);
  }

  // 채널 정보 join
  const channels = await getChannels();
  const channelMap = Object.fromEntries(channels.map(c => [c.id, c]));

  const enriched = contents.map(c => ({
    ...c,
    channel_info: c.channel_id ? channelMap[c.channel_id] ?? null : null,
  }));

  // 채널별 그룹핑
  const grouped: Record<string, typeof enriched> = {};
  for (const item of enriched) {
    const key = item.channel_id ?? 'uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  return apiOk({
    campaign,
    contents: enriched,
    grouped_by_channel: grouped,
    total: enriched.length,
  });
}
