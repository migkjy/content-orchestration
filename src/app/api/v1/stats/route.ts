import { getCampaigns, getChannels, getCampaignContentStats, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk } from '@/lib/api-utils';

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});

  const [campaigns, channels] = await Promise.all([getCampaigns(), getChannels()]);

  // 전체 콘텐츠 통계 합산
  const allStats = await Promise.all(campaigns.map(c => getCampaignContentStats(c.id)));
  const totalStats = allStats.reduce(
    (acc, s) => ({
      draft: acc.draft + s.draft,
      review: acc.review + s.review,
      approved: acc.approved + s.approved,
      scheduled: acc.scheduled + s.scheduled,
      published: acc.published + s.published,
      unwritten: acc.unwritten + s.unwritten,
      cancelled: acc.cancelled + s.cancelled,
      total: acc.total + s.total,
    }),
    { draft: 0, review: 0, approved: 0, scheduled: 0, published: 0, unwritten: 0, cancelled: 0, total: 0 }
  );

  return apiOk({
    campaigns: {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
    },
    channels: {
      total: channels.length,
      connected: channels.filter(c => c.connection_status === 'connected').length,
      disconnected: channels.filter(c => c.connection_status === 'disconnected').length,
    },
    contents: totalStats,
  });
}
