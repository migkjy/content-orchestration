import Link from 'next/link';
import {
  getYoutubeVideos,
  ensureYoutubeSchema,
  YOUTUBE_STATUSES,
  type YoutubeVideo,
} from '@/lib/youtube-db';

export const revalidate = 60;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scripting: 'bg-yellow-100 text-yellow-800',
  filming: 'bg-blue-100 text-blue-800',
  editing: 'bg-purple-100 text-purple-800',
  review: 'bg-orange-100 text-orange-800',
  published: 'bg-green-100 text-green-800',
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

function VideoRow({ video, idx }: { video: YoutubeVideo; idx: number }) {
  return (
    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
        <Link href={`/youtube/${video.id}`} className="hover:text-blue-600 transition-colors">
          {video.title}
        </Link>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={video.status} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">{video.topic || '-'}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{formatScheduledDate(video.scheduled_date)}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{video.views.toLocaleString()}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(video.created_at)}</td>
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
  color: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'yellow';
}) {
  const borderColors = {
    blue: 'border-l-blue-500',
    orange: 'border-l-orange-500',
    green: 'border-l-green-500',
    purple: 'border-l-purple-500',
    red: 'border-l-red-500',
    yellow: 'border-l-yellow-500',
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColors[color]} p-4 shadow-sm`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default async function YouTubeListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await ensureYoutubeSchema().catch(() => {});
  const { status } = await searchParams;

  const allVideos = await getYoutubeVideos().catch(() => [] as YoutubeVideo[]);
  const filteredVideos = status ? allVideos.filter((v) => v.status === status) : allVideos;

  const countByStatus = YOUTUBE_STATUSES.reduce((acc, s) => {
    acc[s] = allVideos.filter((v) => v.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← 전체
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-bold text-gray-800">YouTube 관리</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/youtube/calendar"
              className="px-4 py-1.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              캘린더 보기
            </Link>
            <Link
              href="/youtube/new"
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + 새 영상 등록
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">YouTube 영상 관리</h1>
          <p className="mt-1 text-sm text-gray-500">영상 기획부터 발행까지 파이프라인 관리</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="전체 영상" value={allVideos.length} color="blue" />
          <StatCard title="기획/스크립트" value={countByStatus.draft + countByStatus.scripting} color="yellow" />
          <StatCard title="제작중" value={countByStatus.filming + countByStatus.editing} color="purple" />
          <StatCard title="발행 완료" value={countByStatus.published} color="green" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 flex-wrap">
          <Link
            href="/youtube"
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              !status ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >
            전체 {allVideos.length}
          </Link>
          {YOUTUBE_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/youtube?status=${s}`}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}
            >
              {s} {countByStatus[s]}
            </Link>
          ))}
        </div>

        {/* Video Table */}
        {filteredVideos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">
              {status ? `'${status}' 상태의 영상이 없습니다.` : '등록된 영상이 없습니다.'}
            </p>
            <Link
              href="/youtube/new"
              className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + 첫 영상 등록하기
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">제목</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">주제</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">예정일</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">조회수</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">등록일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVideos.slice(0, 50).map((video, i) => (
                  <VideoRow key={video.id} video={video} idx={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
