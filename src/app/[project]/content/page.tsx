import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/projects';
import { getContentQueueFull } from '@/lib/content-db';
import { BulkActionBar } from '@/components/bulk-action-bar';

export const revalidate = 0;

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
  searchParams: Promise<{ status?: string; channel?: string; search?: string }>;
}) {
  const { project: projectId } = await params;
  const project = getProject(projectId);
  if (!project) notFound();

  const { status: statusFilter, channel: channelFilter, search: searchFilter } = await searchParams;

  // Get all items for stats (unfiltered)
  const allItems = await getContentQueueFull(projectId);

  // Get filtered items for display
  const items = await getContentQueueFull(
    projectId,
    statusFilter === 'all' ? undefined : statusFilter,
    channelFilter,
    searchFilter
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

      {/* Search input */}
      <form method="get" action={`/${projectId}/content`} className="flex gap-2">
        {statusFilter && statusFilter !== 'all' && (
          <input type="hidden" name="status" value={statusFilter} />
        )}
        {channelFilter && (
          <input type="hidden" name="channel" value={channelFilter} />
        )}
        <input
          type="text"
          name="search"
          defaultValue={searchFilter || ''}
          placeholder="제목 검색..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          검색
        </button>
        {searchFilter && (
          <a
            href={`/${projectId}/content?status=${statusFilter || 'all'}${channelFilter ? `&channel=${channelFilter}` : ''}`}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            초기화
          </a>
        )}
      </form>

      {searchFilter && (
        <p className="text-sm text-gray-500">
          &quot;{searchFilter}&quot; 검색 결과 {items.length}건
        </p>
      )}

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

      {/* Content list with bulk actions */}
      <BulkActionBar
        items={items.map((i) => ({
          id: i.id,
          type: i.type,
          pillar: i.pillar,
          topic: i.topic,
          title: i.title,
          content_body: i.content_body,
          status: i.status,
          channel: i.channel,
          scheduled_at: i.scheduled_at,
          approved_by: i.approved_by,
          rejected_reason: i.rejected_reason,
          created_at: i.created_at,
        }))}
        projectId={projectId}
      />
    </div>
  );
}
