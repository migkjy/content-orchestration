import { notFound } from 'next/navigation';
import { getProject } from '@/lib/projects';
import { createContent } from '@/app/actions/content';
import Link from 'next/link';

export default async function NewContentPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = await params;
  const projectConfig = getProject(project);
  if (!projectConfig) notFound();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${project}/content`}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          &larr; 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">새 콘텐츠 작성</h1>
      </div>

      <form action={createContent.bind(null, project)} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            제목 *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="콘텐츠 제목을 입력하세요"
          />
        </div>

        {/* Type + Pillar + Channel */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              유형
            </label>
            <select
              id="type"
              name="type"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="blog">블로그</option>
              <option value="newsletter">뉴스레터</option>
              <option value="sns">SNS</option>
            </select>
          </div>
          <div>
            <label htmlFor="pillar" className="block text-sm font-medium text-gray-700 mb-1">
              필라
            </label>
            <select
              id="pillar"
              name="pillar"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택 안 함</option>
              <option value="ai-tools">AI 도구</option>
              <option value="automation">자동화</option>
              <option value="marketing">마케팅</option>
              <option value="productivity">생산성</option>
              <option value="business">비즈니스</option>
            </select>
          </div>
          <div>
            <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-1">
              채널
            </label>
            <select
              id="channel"
              name="channel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택 안 함</option>
              <option value="blog.apppro.kr">AppPro 블로그</option>
              <option value="brevo">Brevo 이메일</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">X/트위터</option>
              <option value="instagram">인스타그램</option>
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div>
          <label htmlFor="content_body" className="block text-sm font-medium text-gray-700 mb-1">
            본문 (Markdown)
          </label>
          <textarea
            id="content_body"
            name="content_body"
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="마크다운으로 콘텐츠를 작성하세요..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            저장 (draft)
          </button>
          <Link
            href={`/${project}/content`}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
