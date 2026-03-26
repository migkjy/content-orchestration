import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getYoutubeVideoById,
  ensureYoutubeSchema,
  YOUTUBE_STATUSES,
} from '@/lib/youtube-db';
import { advanceVideoStatus, revertVideoStatus, updateVideoDetails, removeVideo } from './actions';

export const revalidate = 0;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  scripting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  filming: 'bg-blue-100 text-blue-800 border-blue-200',
  editing: 'bg-purple-100 text-purple-800 border-purple-200',
  review: 'bg-orange-100 text-orange-800 border-orange-200',
  published: 'bg-green-100 text-green-800 border-green-200',
};

function formatDate(ms: number | null): string {
  if (!ms) return '-';
  return new Date(ms).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const arr = JSON.parse(tagsJson);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default async function YouTubeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureYoutubeSchema().catch(() => {});
  const { id } = await params;
  const video = await getYoutubeVideoById(id).catch(() => null);

  if (!video) notFound();

  const currentIdx = YOUTUBE_STATUSES.indexOf(video.status);
  const nextStatus =
    currentIdx >= 0 && currentIdx < YOUTUBE_STATUSES.length - 1
      ? YOUTUBE_STATUSES[currentIdx + 1]
      : null;
  const prevStatus =
    currentIdx > 0 ? YOUTUBE_STATUSES[currentIdx - 1] : null;

  const tags = parseTags(video.tags);

  const advanceAction = advanceVideoStatus.bind(null, id, nextStatus);
  const revertAction = revertVideoStatus.bind(null, id, prevStatus);
  const updateAction = updateVideoDetails.bind(null, id);
  const removeAction = removeVideo.bind(null, id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
          <Link href="/youtube" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            &larr; YouTube 목록
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-600">영상 상세</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Title + Status */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{video.title}</h1>
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span>등록: {formatDate(video.created_at)}</span>
              {video.published_at && <span>발행: {formatDate(video.published_at)}</span>}
              {video.youtube_url && (
                <a
                  href={video.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  YouTube 링크
                </a>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[video.status] ?? ''}`}>
            {video.status}
          </span>
        </div>

        {/* Status Workflow Stepper */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">제작 워크플로우</p>
          <div className="flex items-center gap-1 flex-wrap">
            {YOUTUBE_STATUSES.map((s, i) => {
              const done = currentIdx >= i;
              const current = video.status === s;
              return (
                <div key={s} className="flex items-center gap-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      current
                        ? STATUS_COLORS[s] ?? 'bg-blue-100 text-blue-800 border-blue-200'
                        : done
                        ? 'bg-gray-100 text-gray-500 border-gray-200'
                        : 'bg-white text-gray-300 border-gray-200'
                    }`}
                  >
                    {s}
                  </span>
                  {i < YOUTUBE_STATUSES.length - 1 && (
                    <span className={`text-xs ${done ? 'text-gray-400' : 'text-gray-200'}`}>&rarr;</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3">
            {prevStatus && (
              <form action={revertAction}>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  &larr; {prevStatus}(으)로 되돌리기
                </button>
              </form>
            )}
            {nextStatus && (
              <form action={advanceAction}>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {nextStatus}(으)로 이동 &rarr;
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Video Info Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center py-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">{video.views.toLocaleString()}</div>
              <div className="text-xs text-gray-500">조회수</div>
            </div>
            <div className="text-center py-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-bold text-gray-900">{video.target_keyword || '-'}</div>
              <div className="text-xs text-gray-500">타겟 키워드</div>
            </div>
            <div className="text-center py-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-bold text-gray-900">
                {video.scheduled_date
                  ? new Date(video.scheduled_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                  : '-'}
              </div>
              <div className="text-xs text-gray-500">예정일</div>
            </div>
            <div className="text-center py-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-bold text-gray-900">{tags.length > 0 ? `${tags.length}개` : '-'}</div>
              <div className="text-xs text-gray-500">태그</div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="mt-4 flex gap-1.5 flex-wrap">
              {tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Edit Form */}
        <form action={updateAction} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
          <p className="text-xs font-semibold text-gray-400 uppercase">영상 정보 편집</p>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              defaultValue={video.title}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">주제</label>
              <input
                type="text"
                id="topic"
                name="topic"
                defaultValue={video.topic ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="target_keyword" className="block text-sm font-medium text-gray-700 mb-1">타겟 키워드</label>
              <input
                type="text"
                id="target_keyword"
                name="target_keyword"
                defaultValue={video.target_keyword ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="script_outline" className="block text-sm font-medium text-gray-700 mb-1">스크립트 개요</label>
            <textarea
              id="script_outline"
              name="script_outline"
              rows={4}
              defaultValue={video.script_outline ?? ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">영상 설명</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={video.description ?? ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">태그</label>
              <input
                type="text"
                id="tags"
                name="tags"
                defaultValue={tags.join(', ')}
                placeholder="쉼표로 구분"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">쉼표(,)로 구분하여 입력</p>
            </div>
            <div>
              <label htmlFor="thumbnail_text" className="block text-sm font-medium text-gray-700 mb-1">썸네일 텍스트</label>
              <input
                type="text"
                id="thumbnail_text"
                name="thumbnail_text"
                defaultValue={video.thumbnail_text ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">발행 예정일</label>
              <input
                type="date"
                id="scheduled_date"
                name="scheduled_date"
                defaultValue={video.scheduled_date ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="youtube_url" className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
              <input
                type="url"
                id="youtube_url"
                name="youtube_url"
                defaultValue={video.youtube_url ?? ''}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <form action={removeAction}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                삭제
              </button>
            </form>
            <div className="flex items-center gap-3">
              <Link
                href="/youtube"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </Link>
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                저장하기
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
