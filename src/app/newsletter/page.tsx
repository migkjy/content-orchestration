import Link from 'next/link';
import { getNewsletters } from '@/lib/content-db';

export const revalidate = 0;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  sent: 'bg-teal-100 text-teal-800 border-teal-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  review: '검토중',
  approved: '승인됨',
  scheduled: '예약됨',
  ready: '발송준비',
  sent: '발송완료',
  failed: '실패',
};

function formatDate(ms: number | null): string {
  if (!ms) return '-';
  return new Date(ms).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function getBrevoSubscriberCount(): Promise<{ total: number; listName: string } | null> {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = process.env.BREVO_LIST_ID || '3';
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}`, {
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
      },
      next: { revalidate: 300 }, // cache 5 min
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      total: data.totalSubscribers ?? data.uniqueSubscribers ?? 0,
      listName: data.name ?? `List #${listId}`,
    };
  } catch {
    return null;
  }
}

export default async function NewsletterDashboardPage() {
  const [newsletters, brevo] = await Promise.all([
    getNewsletters().catch(() => []),
    getBrevoSubscriberCount(),
  ]);

  const statusCounts = newsletters.reduce<Record<string, number>>((acc, nl) => {
    acc[nl.status] = (acc[nl.status] || 0) + 1;
    return acc;
  }, {});

  const sentCount = statusCounts['sent'] || 0;
  const draftCount = statusCounts['draft'] || 0;
  const scheduledCount = (statusCounts['scheduled'] || 0) + (statusCounts['ready'] || 0);
  const failedCount = statusCounts['failed'] || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">뉴스레터 대시보드</h1>
            <p className="mt-1 text-sm text-gray-500">
              뉴스레터 발송 현황 및 Brevo 구독자 관리
            </p>
          </div>
          <Link
            href="/emails"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
          >
            Welcome 이메일 시퀀스 &rarr;
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Brevo Subscribers */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Brevo 구독자</span>
              <span className="text-lg">👥</span>
            </div>
            {brevo ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {brevo.total.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400">명</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{brevo.listName}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-300">-</p>
                <p className="text-xs text-gray-400 mt-1">API 키 미설정</p>
              </>
            )}
          </div>

          {/* Sent */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">발송 완료</span>
              <span className="text-lg">✅</span>
            </div>
            <p className="text-2xl font-bold text-teal-700">{sentCount}</p>
            <p className="text-xs text-gray-400 mt-1">전체 {newsletters.length}건 중</p>
          </div>

          {/* Scheduled */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">예약/준비</span>
              <span className="text-lg">📅</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{scheduledCount}</p>
            <p className="text-xs text-gray-400 mt-1">초안 {draftCount}건</p>
          </div>

          {/* Failed */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">실패</span>
              <span className="text-lg">⚠️</span>
            </div>
            <p className={`text-2xl font-bold ${failedCount > 0 ? 'text-red-600' : 'text-gray-300'}`}>
              {failedCount}
            </p>
            <p className="text-xs text-gray-400 mt-1">재발송 필요</p>
          </div>
        </div>

        {/* Status Overview Bar */}
        {newsletters.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">상태별 분포</h3>
            <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
              {['sent', 'ready', 'scheduled', 'approved', 'review', 'draft', 'failed'].map((status) => {
                const count = statusCounts[status] || 0;
                if (count === 0) return null;
                const pct = (count / newsletters.length) * 100;
                const colors: Record<string, string> = {
                  sent: 'bg-teal-500',
                  ready: 'bg-emerald-400',
                  scheduled: 'bg-purple-400',
                  approved: 'bg-blue-400',
                  review: 'bg-yellow-400',
                  draft: 'bg-gray-300',
                  failed: 'bg-red-500',
                };
                return (
                  <div
                    key={status}
                    className={`h-full ${colors[status] || 'bg-gray-300'}`}
                    style={{ width: `${pct}%` }}
                    title={`${STATUS_LABELS[status] || status}: ${count}건`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
              {Object.entries(statusCounts).map(([status, count]) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full border ${STATUS_COLORS[status] || 'bg-gray-100 border-gray-200'}`} />
                  {STATUS_LABELS[status] || status} {count}건
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Newsletter List */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3">발송 이력</h2>

          {newsletters.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-400 text-sm mb-2">아직 뉴스레터가 없습니다.</p>
              <p className="text-xs text-gray-300">
                콘텐츠 파이프라인에서 뉴스레터를 생성하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">제목</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden sm:table-cell">생성일</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden md:table-cell">발송일</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-5 py-3">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {newsletters.map((nl) => (
                    <tr key={nl.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3">
                        <Link
                          href={`/newsletter/${nl.id}`}
                          className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1"
                        >
                          {nl.subject || '(제목 없음)'}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 hidden sm:table-cell">
                        {formatDate(nl.created_at)}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-400 hidden md:table-cell">
                        {nl.sent_at ? formatDate(nl.sent_at) : '-'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[nl.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}
                        >
                          {STATUS_LABELS[nl.status] || nl.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">관련 페이지</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/emails"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
            >
              📧 Welcome 이메일 시퀀스
            </Link>
            <Link
              href="/channels"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
            >
              📡 채널 관리
            </Link>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
            >
              📅 발행 캘린더
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
