import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getCampaignById,
  getCampaignContents,
  getCampaignContentStats,
  getChannels,
  ensureSchema,
} from '@/lib/content-db';

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  unwritten: '미작성',
  draft: 'Draft',
  review: '검토요청',
  rejected: '반려',
  approved: '승인완료',
  scheduled: '예약',
  published: '발행완료',
  cancelled: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  unwritten: 'bg-gray-100 text-gray-500',
  draft: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  published: 'bg-green-200 text-green-800',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📱',
  youtube: '🎥',
  newsletter: '📰',
  blog: '✍️',
  facebook: '👥',
  x: '🐦',
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema().catch(() => {});
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [contents, stats, allChannels] = await Promise.all([
    getCampaignContents(id),
    getCampaignContentStats(id),
    getChannels(),
  ]);

  // 채널별 그룹핑
  const channelMap = new Map(allChannels.map(c => [c.id, c]));
  const byChannel: Record<string, typeof contents> = {};
  for (const item of contents) {
    const key = item.channel_id ?? '__none__';
    if (!byChannel[key]) byChannel[key] = [];
    byChannel[key].push(item);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 홈</Link>
            <span className="text-sm font-bold text-gray-800">{campaign.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${id}/content/new`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
              + 콘텐츠 추가
            </Link>
            <Link href={`/projects/${id}/edit`} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg">편집</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* 목표 + 통계 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {campaign.goal && (
            <p className="text-sm text-gray-600 mb-4">🎯 {campaign.goal}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-700">{stats.draft + stats.unwritten}</div>
              <div className="text-xs text-gray-500">Draft/미작성</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-700">{stats.review + stats.approved}</div>
              <div className="text-xs text-gray-500">검토중/승인</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-700">{stats.scheduled}</div>
              <div className="text-xs text-gray-500">예약</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-700">{stats.published}</div>
              <div className="text-xs text-gray-500">발행완료</div>
            </div>
          </div>
        </div>

        {/* 채널별 콘텐츠 슬롯 */}
        {Object.keys(byChannel).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
            <p className="text-gray-400 text-sm mb-3">아직 콘텐츠가 없습니다.</p>
            <Link href={`/projects/${id}/content/new`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + 첫 콘텐츠 추가
            </Link>
          </div>
        ) : (
          Object.entries(byChannel).map(([channelId, items]) => {
            const ch = channelId !== '__none__' ? channelMap.get(channelId) : null;
            const emoji = ch ? (PLATFORM_EMOJI[ch.platform] ?? '📄') : '📄';
            const channelName = ch ? `${ch.name} (${ch.account_name ?? ch.platform})` : '채널 미지정';
            const done = items.filter(i => i.status === 'published').length;
            return (
              <div key={channelId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">{emoji} {channelName}</h3>
                  <span className="text-xs text-gray-500">총 {items.length}건 · 발행 {done}건</span>
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
                      {item.status === 'unwritten' ? (
                        <Link href={`/projects/${id}/content/new?channel_id=${channelId}&prefill_id=${item.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">작성하기</Link>
                      ) : (
                        <Link href={`/projects/${id}/content/${item.id}`} className="text-xs text-gray-500 hover:text-gray-700">
                          {item.status === 'draft' || item.status === 'rejected' ? '편집' : '보기'}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
