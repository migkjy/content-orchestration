import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createYoutubeVideo, ensureYoutubeSchema, YOUTUBE_STATUSES } from '@/lib/youtube-db';

export default function YouTubeNewPage() {
  async function createVideo(formData: FormData) {
    'use server';

    await ensureYoutubeSchema().catch(() => {});

    const title = formData.get('title') as string;
    if (!title || !title.trim()) {
      throw new Error('제목은 필수입니다.');
    }

    const tagsRaw = (formData.get('tags') as string)?.trim();
    let tagsJson: string | undefined;
    if (tagsRaw) {
      const tagArray = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
      tagsJson = JSON.stringify(tagArray);
    }

    const id = await createYoutubeVideo({
      title: title.trim(),
      status: (formData.get('status') as string) || 'draft',
      topic: (formData.get('topic') as string)?.trim() || undefined,
      target_keyword: (formData.get('target_keyword') as string)?.trim() || undefined,
      script_outline: (formData.get('script_outline') as string)?.trim() || undefined,
      description: (formData.get('description') as string)?.trim() || undefined,
      tags: tagsJson,
      thumbnail_text: (formData.get('thumbnail_text') as string)?.trim() || undefined,
      scheduled_date: (formData.get('scheduled_date') as string)?.trim() || undefined,
    });

    redirect(`/youtube/${id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
          <Link href="/youtube" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← YouTube 목록
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-600">새 영상 등록</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">새 영상 등록</h1>
            <p className="mt-1 text-sm text-gray-500">YouTube 영상 기획 정보를 등록합니다.</p>
          </div>

          <form action={createVideo} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            {/* Title (Required) */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                placeholder="영상 제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                id="status"
                name="status"
                defaultValue="draft"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {YOUTUBE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic + Target Keyword (2-col) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                  주제
                </label>
                <input
                  type="text"
                  id="topic"
                  name="topic"
                  placeholder="예: AI 자동화 도입 사례"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="target_keyword" className="block text-sm font-medium text-gray-700 mb-1">
                  타겟 키워드
                </label>
                <input
                  type="text"
                  id="target_keyword"
                  name="target_keyword"
                  placeholder="예: AI 마케팅 자동화"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Script Outline */}
            <div>
              <label htmlFor="script_outline" className="block text-sm font-medium text-gray-700 mb-1">
                스크립트 개요
              </label>
              <textarea
                id="script_outline"
                name="script_outline"
                rows={4}
                placeholder="영상 스크립트 개요를 작성하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                영상 설명
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="YouTube 영상 설명란에 들어갈 내용"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
              />
            </div>

            {/* Tags + Thumbnail Text (2-col) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  태그
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  placeholder="쉼표로 구분 (예: AI, 자동화, 마케팅)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">쉼표(,)로 구분하여 입력</p>
              </div>
              <div>
                <label htmlFor="thumbnail_text" className="block text-sm font-medium text-gray-700 mb-1">
                  썸네일 텍스트
                </label>
                <input
                  type="text"
                  id="thumbnail_text"
                  name="thumbnail_text"
                  placeholder="썸네일에 표시할 텍스트"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Scheduled Date */}
            <div>
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-1">
                발행 예정일
              </label>
              <input
                type="date"
                id="scheduled_date"
                name="scheduled_date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
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
                등록하기
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
