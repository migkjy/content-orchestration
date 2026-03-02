import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChannelById, getChannelContents, getCampaigns, ensureSchema } from '@/lib/content-db';

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  unwritten: '미작성', draft: 'Draft', review: '검토요청',
  rejected: '반려', approved: '승인완료', scheduled: '예약',
  published: '발행완료', cancelled: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  unwritten: 'bg-gray-100 text-gray-500',
  draft: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  published: 'bg-green-200 text-green-800',
  cancelled: 'bg-gray-100 text-gray-400',
};

export default async function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema().catch(() => {});
  const { id } = await params;
  const [channel, contents, campaigns] = await Promise.all([
    getChannelById(id),
    getChannelContents(id),
    getCampaigns(),
  ]);
  if (!channel) notFound();

  const campaignMap = new Map(campaigns.map(c => [c.id, c]));
  const byCampaign: Record<string, typeof contents> = {};
  for (const item of contents) {
    const key = item.campaign_id ?? '__none__';
    if (!byCampaign[key]) byCampaign[key] = [];
    byCampaign[key].push(item);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Link href="/channels" className="text-sm text-gray-500 hover:text-gray-700">← 채널 목록</Link>
          <span className="text-sm font-bold text-gray-800">{channel.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500">{channel.connection_status === 'connected' ? '✅' : '⚠️'} {channel.connection_type ?? '미연결'}: {channel.connection_detail ?? '-'}</p>
        </div>

        {Object.entries(byCampaign).map(([campaignId, items]) => {
          const campaign = campaignId !== '__none__' ? campaignMap.get(campaignId) : null;
          return (
            <div key={campaignId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">📌 {campaign?.name ?? '프로젝트 미지정'}</h3>
                <span className="text-xs text-gray-500">{items.length}건</span>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title || '(제목 없음)'}</p>
                      {item.scheduled_at && (
                        <p className="text-xs text-gray-400">{new Date(item.scheduled_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    {campaign && (
                      <Link href={`/projects/${campaign.id}/content/${item.id}`} className="text-xs text-gray-500 hover:text-gray-700">
                        {['draft', 'unwritten', 'rejected'].includes(item.status) ? '편집' : '보기'}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
