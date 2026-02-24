import Link from 'next/link';
import { projects } from '@/lib/projects';
import {
  getNewsletters,
  getContentQueue,
  getPipelineLogs,
  getNewsStats,
  ensureSchema,
} from '@/lib/content-db';

export const revalidate = 60;

export default async function HomePage() {
  await ensureSchema().catch(() => {});

  const [newsletters, queue, pipelines, newsStats] = await Promise.all([
    getNewsletters().catch(() => []),
    getContentQueue().catch(() => []),
    getPipelineLogs().catch(() => []),
    getNewsStats().catch(() => ({ total: 0, used: 0, unused: 0 })),
  ]);

  const lastPipeline = pipelines[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">콘텐츠 오케스트레이션</span>
          <span className="text-xs text-gray-400">멀티 프로젝트 콘텐츠 통합 관리</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전체 프로젝트 현황</h1>
          <p className="mt-1 text-sm text-gray-500">관리 중인 모든 프로젝트의 콘텐츠 파이프라인 요약</p>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">{project.name}</h2>
                {project.available ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                    활성
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                    Coming Soon
                  </span>
                )}
              </div>

              {project.available ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="text-center py-2 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">{newsletters.length}</div>
                      <div className="text-xs text-gray-500">뉴스레터</div>
                    </div>
                    <div className="text-center py-2 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">{queue.filter(q => q.status === 'pending').length}</div>
                      <div className="text-xs text-gray-500">큐 대기</div>
                    </div>
                    <div className="text-center py-2 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">{newsStats.total}</div>
                      <div className="text-xs text-gray-500">수집 기사</div>
                    </div>
                    <div className="text-center py-2 bg-gray-50 rounded-lg">
                      <div className={`text-xl font-bold ${lastPipeline?.status === 'failed' ? 'text-red-600' : 'text-green-700'}`}>
                        {lastPipeline?.status ?? '-'}
                      </div>
                      <div className="text-xs text-gray-500">마지막 파이프라인</div>
                    </div>
                  </div>
                  <Link
                    href={`/${project.id}`}
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    대시보드 열기
                  </Link>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-gray-400">
                  연동 준비 중
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">빠른 탐색 — AppPro.kr</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/apppro" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm">
              ◈ 대시보드
            </Link>
            <Link href="/apppro/calendar" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm">
              ◷ 배포 캘린더
            </Link>
            <Link href="/apppro/rss" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm">
              ◉ RSS 수집
            </Link>
            <Link href="/apppro/logs" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm">
              ≡ 파이프라인 로그
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
