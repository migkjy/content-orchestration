import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/projects';
import { getContentQueueFull } from '@/lib/content-db';
import { approveContent, rejectContent, moveToReview } from '@/app/actions/content';

export const revalidate = 0;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const CHANNEL_LABELS: Record<string, string> = {
  'blog.apppro.kr': '✎ 블로그',
  'linkedin': '◇ LinkedIn',
  'instagram': '◎ 인스타',
  'twitter': '✦ X/트위터',
};

const STATUS_TABS = ['all', 'draft', 'review', 'approved', 'scheduled', 'published'];

export default async function ContentWorkflowPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ status?: string; channel?: string }>;
}) {
  const { project: projectId } = await params;
  const project = getProject(projectId);
  if (!project) notFound();

  const { status: statusFilter, channel: channelFilter } = await searchParams;

  const items = await getContentQueueFull(
    projectId,
    statusFilter === 'all' ? undefined : statusFilter,
    channelFilter
  );

  // channel counts
  const channelCounts = items.reduce((acc, item) => {
    const ch = item.channel || 'unknown';
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // status counts (from all items)
  const allItems = await getContentQueueFull(projectId);
  const statusCounts = allItems.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {project.name} · 콘텐츠 워크플로우
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            draft → 검수 → 승인 → 발행 파이프라인
          </p>
        </div>
        <Link
          href={`/${projectId}/content/new`}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          + 새 콘텐츠
        </Link>
      </div>

      {/* status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => {
          const count = s === 'all' ? allItems.length : (statusCounts[s] || 0);
          const isActive = (statusFilter || 'all') === s;
          return (
            <a
              key={s}
              href={`/${projectId}/content?status=${s}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? '전체' : s}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* channel filter */}
      <div className="flex gap-2 text-xs">
        <a href={`/${projectId}/content?status=${statusFilter || 'all'}`}
          className="text-gray-500 hover:text-gray-900">전체 채널</a>
        {Object.entries(CHANNEL_LABELS).map(([ch, label]) => (
          <a key={ch}
            href={`/${projectId}/content?status=${statusFilter || 'all'}&channel=${ch}`}
            className="text-blue-600 hover:text-blue-800">
            {label} ({channelCounts[ch] || 0})
          </a>
        ))}
      </div>

      {/* content list */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
            해당 상태의 콘텐츠가 없습니다
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400 uppercase font-mono">
                    {CHANNEL_LABELS[item.channel || ''] || item.channel || '-'}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.status}
                  </span>
                  {item.pillar && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                      {item.pillar}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-gray-900 leading-snug">
                  <Link
                    href={`/${projectId}/content/${item.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {item.title || item.topic || '(제목 없음)'}
                  </Link>
                </h3>
                {item.approved_by && (
                  <p className="text-xs text-gray-400 mt-1">승인: {item.approved_by}</p>
                )}
                {item.scheduled_at && (
                  <p className="text-xs text-purple-500 mt-1">
                    🕐 {new Date(item.scheduled_at).toLocaleString('ko-KR')} 예약
                  </p>
                )}
                {item.rejected_reason && (
                  <p className="text-xs text-red-500 mt-1">반려: {item.rejected_reason}</p>
                )}
              </div>

              {/* action buttons */}
              <div className="flex flex-wrap gap-2 shrink-0">
                {item.status === 'draft' && (
                  <form action={moveToReview.bind(null, item.id, projectId)}>
                    <button type="submit"
                      className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors">
                      검수 요청
                    </button>
                  </form>
                )}
                {(item.status === 'draft' || item.status === 'review') && (
                  <form action={approveContent.bind(null, item.id, projectId)}>
                    <button type="submit"
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
                      승인
                    </button>
                  </form>
                )}
                {item.status !== 'published' && item.status !== 'rejected' && (
                  <form action={rejectContent.bind(null, item.id, projectId, '검토 후 반려')}>
                    <button type="submit"
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors">
                      반려
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
