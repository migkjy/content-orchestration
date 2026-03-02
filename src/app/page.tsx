import Link from 'next/link';
import { getCampaigns, getCampaignContentStats, ensureSchema } from '@/lib/content-db';

export const revalidate = 60;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  active: '진행중',
  paused: '일시중단',
  completed: '완료',
  archived: '아카이브',
};

export default async function HomePage() {
  await ensureSchema().catch(() => {});
  const campaigns = await getCampaigns().catch(() => []);

  const campaignStats = await Promise.all(
    campaigns.map(async (c) => ({
      campaign: c,
      stats: await getCampaignContentStats(c.id).catch(() => ({
        draft: 0, review: 0, approved: 0, scheduled: 0, published: 0, unwritten: 0, cancelled: 0, total: 0,
      })),
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">콘텐츠 오케스트레이션</span>
          <div className="flex items-center gap-3">
            <Link href="/channels" className="text-xs text-gray-500 hover:text-blue-600 transition-colors">채널 관리</Link>
            <Link href="/calendar" className="text-xs text-gray-500 hover:text-blue-600 transition-colors">캘린더</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
            <p className="mt-1 text-sm text-gray-500">캠페인별 콘텐츠 오케스트레이션</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 새 프로젝트
          </Link>
        </div>

        {campaignStats.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-4">아직 프로젝트가 없습니다.</p>
            <Link href="/projects/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + 첫 프로젝트 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignStats.map(({ campaign, stats }) => (
              <div key={campaign.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-gray-900 truncate">{campaign.name}</h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[campaign.status] ?? campaign.status}
                  </span>
                </div>
                {campaign.goal && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-1">{campaign.goal}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-4">
                  <span className="font-medium text-yellow-700">Draft {stats.draft + stats.unwritten}</span>
                  <span>·</span>
                  <span className="font-medium text-purple-700">예약 {stats.scheduled}</span>
                  <span>·</span>
                  <span className="font-medium text-gray-500">발행 누적 {stats.published}</span>
                </div>
                <Link
                  href={`/projects/${campaign.id}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  열기
                </Link>
              </div>
            ))}

            <Link
              href="/projects/new"
              className="flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 shadow-sm p-5 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[160px]"
            >
              + 새 프로젝트 만들기
            </Link>
          </div>
        )}

        {/* 빠른 탐색 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">빠른 탐색</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/channels" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
              채널별 뷰
            </Link>
            <Link href="/calendar" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
              캘린더
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
