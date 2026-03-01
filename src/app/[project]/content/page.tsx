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
  'blog.apppro.kr': '블로그',
  'brevo': '이메일',
  'linkedin': 'LinkedIn',
  'instagram': '인스타',
  'twitter': 'X',
};

const STATUS_TABS = ['all', 'draft', 'review', 'approved', 'scheduled', 'published'];

const STATUS_LABELS: Record<string, string> = {
  all: '전체',
  draft: 'Draft',
  review: '검수',
  approved: '승인',
  scheduled: '예약',
  published: '발행',
};

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

  // Get all items for stats (unfiltered)
  const allItems = await getContentQueueFull(projectId);

  // Get filtered items for display
  const items = await getContentQueueFull(
    projectId,
    statusFilter === 'all' ? undefined : statusFilter,
    channelFilter
  );

  // Compute stats
  const stats = {
    total: allItems.length,
    blog: allItems.filter(i => i.channel === 'blog.apppro.kr').length,
    email: allItems.filter(i => i.channel === 'brevo').length,
    sns: allItems.filter(i => ['linkedin', 'instagram', 'twitter'].includes(i.channel || '')).length,
    published: allItems.filter(i => i.status === 'published').length,
    blogDraft: allItems.filter(i => i.channel === 'blog.apppro.kr' && i.status === 'draft').length,
    emailDraft: allItems.filter(i => i.channel === 'brevo' && i.status === 'draft').length,
    snsDraft: allItems.filter(i => ['linkedin', 'instagram', 'twitter'].includes(i.channel || '') && i.status === 'draft').length,
  };

  // Status counts for tabs
  const statusCounts = allItems.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">전체 콘텐츠</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-1">발행 {stats.published}편</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs text-blue-400 mb-1">블로그</p>
          <p className="text-3xl font-bold text-blue-700">{stats.blog}</p>
          <p className="text-xs text-blue-400 mt-1">draft {stats.blogDraft}편</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <p className="text-xs text-green-400 mb-1">이메일</p>
          <p className="text-3xl font-bold text-green-700">{stats.email}</p>
          <p className="text-xs text-green-400 mt-1">draft {stats.emailDraft}편</p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
          <p className="text-xs text-purple-400 mb-1">SNS</p>
          <p className="text-3xl font-bold text-purple-700">{stats.sns}</p>
          <p className="text-xs text-purple-400 mt-1">draft {stats.snsDraft}편</p>
        </div>
      </div>

      {/* Channel tabs (row 1) */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: '', label: '전체 채널' },
          { key: 'blog.apppro.kr', label: '블로그' },
          { key: 'brevo', label: '이메일' },
          { key: 'linkedin', label: 'LinkedIn' },
          { key: 'instagram', label: '인스타' },
          { key: 'twitter', label: 'X' },
        ].map(({ key, label }) => {
          const isActive = (channelFilter || '') === key;
          const count = key === '' ? allItems.length : allItems.filter(i => i.channel === key).length;
          return (
            <a
              key={key}
              href={`/${projectId}/content?status=${statusFilter || 'all'}${key ? `&channel=${key}` : ''}`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </a>
          );
        })}
      </div>

      {/* Status tabs (row 2 - smaller) */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => {
          const count = s === 'all' ? allItems.length : (statusCounts[s] || 0);
          const isActive = (statusFilter || 'all') === s;
          return (
            <a
              key={s}
              href={`/${projectId}/content?status=${s}${channelFilter ? `&channel=${channelFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {STATUS_LABELS[s] || s}
              {count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* Content list */}
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            해당 조건의 콘텐츠가 없습니다
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
            {/* Clickable area -> detail page */}
            <Link href={`/${projectId}/content/${item.id}`} className="block p-5">
              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'
                }`}>
                  {item.status}
                </span>
                {item.channel && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {CHANNEL_LABELS[item.channel] || item.channel}
                  </span>
                )}
                {item.pillar && (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {item.pillar}
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-gray-900 leading-snug mb-2">
                {item.title || item.topic || '(제목 없음)'}
              </h3>

              {/* Body preview */}
              {item.content_body && (
                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                  {item.content_body.replace(/[#*`\[\]]/g, '').slice(0, 150)}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
                {item.scheduled_at && (
                  <span className="text-purple-500">
                    {new Date(item.scheduled_at).toLocaleDateString('ko-KR')} 예약
                  </span>
                )}
                {item.approved_by && <span>승인됨</span>}
                {item.rejected_reason && <span className="text-red-400">반려됨</span>}
                <span>{new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
              </div>
            </Link>

            {/* Action buttons — outside Link to prevent nesting */}
            {(item.status === 'draft' || item.status === 'review' ||
              (item.status !== 'published' && item.status !== 'rejected')) && (
              <div className="px-5 pb-4 pt-0 flex flex-wrap gap-2 border-t border-gray-100">
                {item.status === 'draft' && (
                  <form action={moveToReview.bind(null, item.id, projectId)}>
                    <button type="submit"
                      className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors">
                      검수 요청
                    </button>
                  </form>
                )}
                {(item.status === 'draft' || item.status === 'review') && (
                  <form action={approveContent.bind(null, item.id, projectId)}>
                    <button type="submit"
                      className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      승인
                    </button>
                  </form>
                )}
                {item.status !== 'published' && item.status !== 'rejected' && (
                  <form action={rejectContent.bind(null, item.id, projectId, '검토 후 반려')}>
                    <button type="submit"
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                      반려
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
