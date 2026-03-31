import Link from 'next/link';
import { getCampaigns, getCampaignContentStats, ensureSchema } from '@/lib/content-db';
import { getKoreaAiHubOkr } from '@/lib/kanban-db';
import { getAllEmails, SERVICES, SEQUENCES } from '@/lib/email-data';
import { getYoutubeVideos, ensureYoutubeSchema, YOUTUBE_STATUSES } from '@/lib/youtube-db';
import { getSnsPosts, ensureSnsSchema, SNS_PLATFORMS } from '@/lib/sns-db';

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

const YT_STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  scripting: '스크립트',
  filming: '촬영',
  editing: '편집',
  review: '검토',
  published: '발행',
};

const YT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scripting: 'bg-yellow-100 text-yellow-700',
  filming: 'bg-orange-100 text-orange-700',
  editing: 'bg-purple-100 text-purple-700',
  review: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
};

const SNS_STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  approved: '승인',
  scheduled: '예약',
  published: '발행',
};

const SNS_PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
};

const SNS_PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-700',
  linkedin: 'bg-blue-100 text-blue-700',
  twitter: 'bg-sky-100 text-sky-700',
};

/** Get Monday of the current week (KST) */
function getWeekRange(): { start: Date; end: Date; days: Date[] } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  return { start: monday, end: sunday, days };
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default async function HomePage() {
  await ensureSchema().catch(() => {});
  await ensureYoutubeSchema().catch(() => {});
  await ensureSnsSchema().catch(() => {});

  const campaigns = await getCampaigns().catch(() => []);

  const [campaignStats, okrResults, youtubeVideos, snsPosts] = await Promise.all([
    Promise.all(
      campaigns.map(async (c) => ({
        campaign: c,
        stats: await getCampaignContentStats(c.id).catch(() => ({
          draft: 0, review: 0, approved: 0, scheduled: 0, published: 0, unwritten: 0, cancelled: 0, total: 0,
        })),
      }))
    ),
    getKoreaAiHubOkr().catch(() => []),
    getYoutubeVideos().catch(() => []),
    getSnsPosts().catch(() => []),
  ]);

  // 이메일 현황 계산
  const emails = getAllEmails();
  const totalEmails = SERVICES.length * SEQUENCES.length;
  const approvedEmails = emails.filter((e) => e.status === 'approved' || e.status === 'sent').length;
  const sentEmails = emails.filter((e) => e.status === 'sent').length;

  // 전체 콘텐츠 집계
  const totalPublished = campaignStats.reduce((sum, { stats }) => sum + stats.published, 0);
  const totalScheduled = campaignStats.reduce((sum, { stats }) => sum + stats.scheduled, 0);
  const totalDraft = campaignStats.reduce((sum, { stats }) => sum + stats.draft + stats.unwritten, 0);

  // OKR 현황
  const greenKRs = okrResults.filter((kr) => {
    const pct = kr.target_value > 0 ? (kr.current_value / kr.target_value) * 100 : 0;
    return kr.status === 'green' || pct >= 70;
  }).length;

  // YouTube 상태별 분포
  const ytStatusCounts: Record<string, number> = {};
  for (const s of YOUTUBE_STATUSES) ytStatusCounts[s] = 0;
  for (const v of youtubeVideos) ytStatusCounts[v.status] = (ytStatusCounts[v.status] || 0) + 1;

  // SNS 플랫폼별 분포
  const snsPlatformCounts: Record<string, number> = {};
  for (const p of SNS_PLATFORMS) snsPlatformCounts[p] = 0;
  for (const post of snsPosts) snsPlatformCounts[post.platform] = (snsPlatformCounts[post.platform] || 0) + 1;

  // SNS 상태별 분포
  const snsStatusCounts: Record<string, number> = {};
  for (const post of snsPosts) snsStatusCounts[post.status] = (snsStatusCounts[post.status] || 0) + 1;

  // 주간 캘린더 데이터
  const week = getWeekRange();
  const weekStartStr = week.start.toISOString().slice(0, 10);
  const weekEndStr = week.end.toISOString().slice(0, 10);

  // YouTube scheduled this week
  const ytThisWeek = youtubeVideos.filter((v) => {
    if (!v.scheduled_date) return false;
    return v.scheduled_date >= weekStartStr && v.scheduled_date <= weekEndStr;
  });

  // SNS scheduled this week
  const snsThisWeek = snsPosts.filter((p) => {
    if (!p.scheduled_date) return false;
    return p.scheduled_date >= weekStartStr && p.scheduled_date <= weekEndStr;
  });

  // Group by day of week
  type CalendarItem = { type: 'youtube' | 'sns' | 'email'; title: string; status: string };
  const weekCalendar: CalendarItem[][] = week.days.map(() => []);

  for (const v of ytThisWeek) {
    const dateStr = v.scheduled_date!;
    const dayIdx = week.days.findIndex((d) => d.toISOString().slice(0, 10) === dateStr);
    if (dayIdx >= 0) weekCalendar[dayIdx].push({ type: 'youtube', title: v.title, status: v.status });
  }
  for (const p of snsThisWeek) {
    const dateStr = p.scheduled_date!;
    const dayIdx = week.days.findIndex((d) => d.toISOString().slice(0, 10) === dateStr);
    if (dayIdx >= 0) weekCalendar[dayIdx].push({ type: 'sns', title: p.title, status: p.status });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">

        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
            <p className="mt-1 text-sm text-gray-500">콘텐츠 파이프라인 통합 현황</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 새 프로젝트
          </Link>
        </div>

        {/* 요약 메트릭 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/emails" className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">이메일 시퀀스</span>
              <span className="text-lg">📧</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-700">
              {approvedEmails}<span className="text-sm font-normal text-gray-400">/{totalEmails}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">승인 완료 · 발송 {sentEmails}건</p>
          </Link>

          <Link href="/calendar" className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">발행 콘텐츠</span>
              <span className="text-lg">📅</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-700">{totalPublished}</p>
            <p className="text-xs text-gray-400 mt-1">예약 {totalScheduled}건 · 초안 {totalDraft}건</p>
          </Link>

          <Link href="/documents" className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">활성 프로젝트</span>
              <span className="text-lg">🗂️</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-700">
              {campaignStats.filter(({ campaign }) => campaign.status === 'active').length}
            </p>
            <p className="text-xs text-gray-400 mt-1">전체 {campaigns.length}개 캠페인</p>
          </Link>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">OKR 달성</span>
              <span className="text-lg">📊</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {greenKRs}<span className="text-sm font-normal text-gray-400">/{okrResults.length}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">GREEN KR 달성</p>
          </div>
        </div>

        {/* YouTube + SNS + Newsletter 통합 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* YouTube 요약 */}
          <Link href="/youtube" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-red-300 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 group-hover:text-red-600">YouTube</h2>
              <span className="text-xs font-medium text-gray-400">{youtubeVideos.length}편 등록</span>
            </div>
            {youtubeVideos.length === 0 ? (
              <p className="text-xs text-gray-400">아직 등록된 영상이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {YOUTUBE_STATUSES.map((s) =>
                    ytStatusCounts[s] > 0 ? (
                      <span key={s} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${YT_STATUS_COLORS[s]}`}>
                        {YT_STATUS_LABELS[s]} {ytStatusCounts[s]}
                      </span>
                    ) : null
                  )}
                </div>
                {/* Progress bar: published ratio */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>발행 진척</span>
                    <span>{ytStatusCounts['published']}/{youtubeVideos.length}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: `${youtubeVideos.length > 0 ? Math.round((ytStatusCounts['published'] / youtubeVideos.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Link>

          {/* SNS 요약 */}
          <Link href="/sns" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-purple-300 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 group-hover:text-purple-600">SNS</h2>
              <span className="text-xs font-medium text-gray-400">{snsPosts.length}건 등록</span>
            </div>
            {snsPosts.length === 0 ? (
              <p className="text-xs text-gray-400">아직 등록된 포스트가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {/* Platform distribution */}
                <div className="flex flex-wrap gap-1.5">
                  {SNS_PLATFORMS.map((p) =>
                    snsPlatformCounts[p] > 0 ? (
                      <span key={p} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SNS_PLATFORM_COLORS[p]}`}>
                        {SNS_PLATFORM_LABELS[p]} {snsPlatformCounts[p]}
                      </span>
                    ) : null
                  )}
                </div>
                {/* Status distribution */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  {Object.entries(snsStatusCounts).map(([status, count]) => (
                    <span key={status}>
                      {SNS_STATUS_LABELS[status] || status} <span className="font-medium text-gray-700">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Link>

          {/* 뉴스레터/이메일 요약 */}
          <Link href="/emails" className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-green-300 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 group-hover:text-green-600">뉴스레터/이메일</h2>
              <span className="text-xs font-medium text-gray-400">{totalEmails}건 전체</span>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">{emails.filter((e) => e.status === 'draft').length}</p>
                  <p className="text-xs text-gray-500">초안</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-blue-700">{approvedEmails}</p>
                  <p className="text-xs text-gray-500">승인</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-green-700">{sentEmails}</p>
                  <p className="text-xs text-gray-500">발송</p>
                </div>
              </div>
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>승인 진척</span>
                  <span>{approvedEmails}/{totalEmails}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${totalEmails > 0 ? Math.round((approvedEmails / totalEmails) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 주간 캘린더 미니뷰 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700">이번 주 콘텐츠 캘린더</h2>
            <Link href="/calendar" className="text-xs text-blue-600 hover:underline">전체 캘린더</Link>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {week.days.map((day, idx) => {
              const isToday = day.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
              const items = weekCalendar[idx];
              return (
                <div
                  key={idx}
                  className={`rounded-lg border p-2 min-h-[80px] ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isToday ? 'text-blue-700' : 'text-gray-500'}`}>
                      {DAY_LABELS[idx]}
                    </span>
                    <span className={`text-xs ${isToday ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {items.length === 0 ? (
                      <span className="text-xs text-gray-300">-</span>
                    ) : (
                      items.slice(0, 3).map((item, i) => (
                        <div
                          key={i}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${
                            item.type === 'youtube'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                          title={item.title}
                        >
                          {item.type === 'youtube' ? 'YT' : 'SNS'} {item.title.slice(0, 8)}
                        </div>
                      ))
                    )}
                    {items.length > 3 && (
                      <span className="text-xs text-gray-400">+{items.length - 3}건</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {ytThisWeek.length === 0 && snsThisWeek.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-3">이번 주 예정된 콘텐츠가 없습니다.</p>
          )}
        </div>

        {/* Quick Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">빠른 탐색</h2>
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
            <Link href="/youtube" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-700 hover:border-red-400 hover:text-red-600 transition-colors shadow-sm">
              ▶ YouTube 관리
            </Link>
            <Link href="/newsletter" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-teal-200 rounded-lg text-sm font-medium text-teal-700 hover:border-teal-400 hover:text-teal-600 transition-colors shadow-sm">
              📰 뉴스레터
            </Link>
          </div>
        </div>

        {/* 프로젝트 (캠페인) 목록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">프로젝트</h2>
            <Link href="/projects/new" className="text-xs text-blue-600 hover:underline">+ 추가</Link>
          </div>

          {campaignStats.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-400 text-sm mb-4">아직 프로젝트가 없습니다.</p>
              <Link href="/projects/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                + 첫 프로젝트 만들기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaignStats.map(({ campaign, stats }) => (
                <div key={campaign.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900 truncate">{campaign.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[campaign.status] ?? campaign.status}
                    </span>
                  </div>
                  {campaign.goal && (
                    <p className="text-xs text-gray-400 mb-3 line-clamp-1">{campaign.goal}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-4">
                    <span className="font-medium text-yellow-700">초안 {stats.draft + stats.unwritten}</span>
                    <span>·</span>
                    <span className="font-medium text-purple-700">예약 {stats.scheduled}</span>
                    <span>·</span>
                    <span className="font-medium text-gray-500">발행 {stats.published}</span>
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
        </div>

        {/* AIHub Korea OKR 보고서 */}
        {okrResults.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">AIHub Korea OKR</h2>
              <a
                href="https://aihubkorea.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                aihubkorea.kr
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {okrResults.map((kr) => {
                const pct = kr.target_value > 0 ? Math.round((kr.current_value / kr.target_value) * 100) : 0;
                const colorClass = kr.status === 'green' || pct >= 70
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : pct >= 40
                    ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
                    : 'text-red-700 bg-red-50 border-red-200';
                return (
                  <div key={kr.id} className={`rounded-lg border p-3 ${colorClass}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{kr.id}</span>
                      <span className="text-xs font-medium">{pct}%</span>
                    </div>
                    <p className="text-xs leading-snug mb-2 line-clamp-2">{kr.title}</p>
                    <div className="w-full bg-white/50 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-current opacity-60"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs mt-1 opacity-75">
                      {kr.current_value} / {kr.target_value} {kr.unit || ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
