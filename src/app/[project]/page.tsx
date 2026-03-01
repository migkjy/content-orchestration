import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject } from '@/lib/projects';
import {
  getContentQueueFull,
  getAllPublishLogs,
  type ContentQueueItem,
  type PublishLog,
} from '@/lib/content-db';

export const revalidate = 60;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  published: 'bg-green-100 text-green-800',
};

const WORKFLOW_STATUSES = [
  { key: 'draft', label: 'Draft', color: 'gray', border: 'border-l-gray-400' },
  { key: 'review', label: '검수', color: 'yellow', border: 'border-l-yellow-400' },
  { key: 'approved', label: '승인', color: 'blue', border: 'border-l-blue-400' },
  { key: 'scheduled', label: '예약', color: 'purple', border: 'border-l-purple-400' },
  { key: 'published', label: '발행', color: 'green', border: 'border-l-green-500' },
] as const;

function formatDate(ms: number | null): string {
  if (!ms) return '-';
  return new Date(ms).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: projectId } = await params;
  const projectConfig = getProject(projectId);
  if (!projectConfig) notFound();
  if (!projectConfig.available) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-medium">Coming Soon</p>
        <p className="text-sm mt-2">{projectConfig.name} 연동을 준비 중입니다.</p>
      </div>
    );
  }

  const [allContent, publishLogs] = await Promise.all([
    getContentQueueFull(projectId).catch(() => [] as ContentQueueItem[]),
    getAllPublishLogs().catch(() => [] as PublishLog[]),
  ]);

  const stats = {
    draft: allContent.filter((i) => i.status === 'draft').length,
    review: allContent.filter((i) => i.status === 'review').length,
    approved: allContent.filter((i) => i.status === 'approved').length,
    scheduled: allContent.filter((i) => i.status === 'scheduled').length,
    published: allContent.filter((i) => i.status === 'published').length,
    total: allContent.length,
  };

  // Channel publish stats from publish_logs
  const channelStats = publishLogs.reduce(
    (acc, log) => {
      const ch = log.platform_id || 'unknown';
      if (!acc[ch]) acc[ch] = { success: 0, failed: 0 };
      if (log.status === 'success' || log.status === 'published') {
        acc[ch].success++;
      } else if (log.status === 'failed') {
        acc[ch].failed++;
      }
      return acc;
    },
    {} as Record<string, { success: number; failed: number }>
  );

  // Recently published content
  const recentPublished = allContent
    .filter((i) => i.status === 'published')
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{projectConfig.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            콘텐츠 워크플로우 대시보드 — 전체 {stats.total}건
          </p>
        </div>
        <Link
          href={`/${projectId}/content/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          + 새 콘텐츠
        </Link>
      </div>

      {/* Workflow Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {WORKFLOW_STATUSES.map((ws) => (
          <Link
            key={ws.key}
            href={`/${projectId}/content?status=${ws.key}`}
            className={`bg-white rounded-xl border border-gray-200 border-l-4 ${ws.border} p-4 shadow-sm hover:shadow-md transition-shadow`}
          >
            <p className="text-xs font-medium text-gray-500 mb-1">{ws.label}</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats[ws.key as keyof typeof stats]}
            </p>
            <p className="text-xs text-gray-400 mt-1">건</p>
          </Link>
        ))}
      </div>

      {/* Channel Publish Stats */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">채널별 발행 현황</h2>
        {Object.keys(channelStats).length === 0 ? (
          <EmptyState message="발행 기록이 없습니다." />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="space-y-3">
              {Object.entries(channelStats).map(([channel, counts]) => (
                <div key={channel} className="flex items-center gap-4">
                  <span className="text-sm text-gray-700 w-40 shrink-0 font-medium">
                    {channel}
                  </span>
                  <div className="flex-1 flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      성공 {counts.success}건
                    </span>
                    {counts.failed > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        실패 {counts.failed}건
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Recent Published Content */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">최근 발행 콘텐츠</h2>
          <Link
            href={`/${projectId}/content?status=published`}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            전체 보기 &rarr;
          </Link>
        </div>
        {recentPublished.length === 0 ? (
          <EmptyState message="발행된 콘텐츠가 없습니다." />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">제목</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">채널</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">작성일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPublished.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
                      <Link
                        href={`/${projectId}/content/${item.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {item.title || '(제목 없음)'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.channel || '-'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">빠른 링크</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${projectId}/content`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
          >
            콘텐츠 전체보기
          </Link>
          <Link
            href={`/${projectId}/analytics`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
          >
            성과 분석
          </Link>
          <Link
            href={`/${projectId}/calendar`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
          >
            배포 캘린더
          </Link>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}
