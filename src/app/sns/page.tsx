import Link from 'next/link';
import {
  getSnsPosts,
  ensureSnsSchema,
  SNS_STATUSES,
  SNS_PLATFORMS,
  type SnsPost,
} from '@/lib/sns-db';

export const revalidate = 60;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-800',
  linkedin: 'bg-sky-100 text-sky-800',
  twitter: 'bg-slate-100 text-slate-800',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
};

function formatDate(ms: number | null): string {
  if (!ms) return '-';
  return new Date(ms).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatScheduledDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
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

function PlatformBadge({ platform }: { platform: string }) {
  const cls = PLATFORM_COLORS[platform] ?? 'bg-gray-100 text-gray-600';
  const label = PLATFORM_LABELS[platform] ?? platform;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function PostRow({ post, idx }: { post: SnsPost; idx: number }) {
  return (
    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
        {post.title}
      </td>
      <td className="px-4 py-3">
        <PlatformBadge platform={post.platform} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={post.status} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{formatScheduledDate(post.scheduled_date)}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{post.engagement_count.toLocaleString()}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(post.created_at)}</td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {post.post_url ? (
          <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            Link
          </a>
        ) : '-'}
      </td>
    </tr>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'yellow' | 'pink' | 'sky';
}) {
  const borderColors: Record<string, string> = {
    blue: 'border-l-blue-500',
    orange: 'border-l-orange-500',
    green: 'border-l-green-500',
    purple: 'border-l-purple-500',
    red: 'border-l-red-500',
    yellow: 'border-l-yellow-500',
    pink: 'border-l-pink-500',
    sky: 'border-l-sky-500',
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColors[color]} p-4 shadow-sm`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default async function SnsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; platform?: string }>;
}) {
  await ensureSnsSchema().catch(() => {});
  const { status, platform } = await searchParams;

  const allPosts = await getSnsPosts().catch(() => [] as SnsPost[]);

  // Apply filters client-side for stat accuracy
  let filteredPosts = allPosts;
  if (platform) filteredPosts = filteredPosts.filter((p) => p.platform === platform);
  if (status) filteredPosts = filteredPosts.filter((p) => p.status === status);

  const countByStatus = SNS_STATUSES.reduce((acc, s) => {
    acc[s] = allPosts.filter((p) => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const countByPlatform = SNS_PLATFORMS.reduce((acc, p) => {
    acc[p] = allPosts.filter((post) => post.platform === p).length;
    return acc;
  }, {} as Record<string, number>);

  // Build filter query helper
  const buildFilterUrl = (newStatus?: string, newPlatform?: string) => {
    const params = new URLSearchParams();
    if (newStatus) params.set('status', newStatus);
    if (newPlatform) params.set('platform', newPlatform);
    const qs = params.toString();
    return `/sns${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SNS 콘텐츠 관리</h1>
          <p className="mt-1 text-sm text-gray-500">Instagram, LinkedIn, Twitter/X 발행 트래킹</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="전체 포스트" value={allPosts.length} color="blue" />
          <StatCard title="Instagram" value={countByPlatform.instagram ?? 0} color="pink" />
          <StatCard title="LinkedIn" value={countByPlatform.linkedin ?? 0} color="sky" />
          <StatCard title="발행 완료" value={countByStatus.published ?? 0} color="green" />
        </div>

        {/* Platform Filter */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">플랫폼</p>
          <div className="flex gap-1 flex-wrap">
            <Link
              href={buildFilterUrl(status, undefined)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                !platform ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}
            >
              전체 {allPosts.length}
            </Link>
            {SNS_PLATFORMS.map((p) => (
              <Link
                key={p}
                href={buildFilterUrl(status, p)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  platform === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
                }`}
              >
                {PLATFORM_LABELS[p]} {countByPlatform[p] ?? 0}
              </Link>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">상태</p>
          <div className="flex gap-1 flex-wrap">
            <Link
              href={buildFilterUrl(undefined, platform)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                !status ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}
            >
              전체 {allPosts.length}
            </Link>
            {SNS_STATUSES.map((s) => (
              <Link
                key={s}
                href={buildFilterUrl(s, platform)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
                }`}
              >
                {s} {countByStatus[s] ?? 0}
              </Link>
            ))}
          </div>
        </div>

        {/* Posts Table */}
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">
              {status || platform ? '조건에 맞는 포스트가 없습니다.' : '등록된 SNS 포스트가 없습니다.'}
            </p>
            <p className="text-gray-300 text-xs mt-2">
              API를 통해 포스트를 등록하세요 (POST /api/sns)
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">제목</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">플랫폼</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">예정일</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">반응수</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">등록일</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">링크</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPosts.slice(0, 50).map((post, i) => (
                  <PostRow key={post.id} post={post} idx={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
