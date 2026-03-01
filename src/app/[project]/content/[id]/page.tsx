import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProject } from '@/lib/projects';
import { getContentById, getPublishLogs } from '@/lib/content-db';
import {
  updateContentAction,
  approveContent,
  rejectContent,
  moveToReview,
  moveToDraft,
} from '@/app/actions/content';
import { publishToBrevo } from '@/app/actions/publish';
import { ContentEditor } from '@/components/content-editor';

export const revalidate = 0;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  failed: 'bg-red-200 text-red-900',
};

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ project: string; id: string }>;
}) {
  const { project, id } = await params;
  const projectConfig = getProject(project);
  if (!projectConfig) notFound();

  const item = await getContentById(id);
  if (!item) notFound();

  const publishLogs = await getPublishLogs(id);
  const isEditable = item.status === 'draft' || item.status === 'review';
  const metadata = item.metadata ? (() => { try { return JSON.parse(item.metadata!); } catch { return {}; } })() : {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${project}/content`}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            &larr; 목록
          </Link>
          <span className={`px-2.5 py-1 rounded text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
            {item.status}
          </span>
          {item.pillar && (
            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              {item.pillar}
            </span>
          )}
          {item.channel && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {item.channel}
            </span>
          )}
        </div>

        {/* Status transition buttons */}
        <div className="flex flex-wrap gap-2">
          {item.status === 'draft' && (
            <form action={moveToReview.bind(null, item.id, project)}>
              <button type="submit" className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 transition-colors">
                검수 요청
              </button>
            </form>
          )}
          {(item.status === 'draft' || item.status === 'review') && (
            <form action={approveContent.bind(null, item.id, project)}>
              <button type="submit" className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
                승인
              </button>
            </form>
          )}
          {item.status !== 'published' && item.status !== 'rejected' && item.status !== 'draft' && (
            <form action={rejectContent.bind(null, item.id, project, '검토 후 반려')}>
              <button type="submit" className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors">
                반려
              </button>
            </form>
          )}
          {(item.status === 'rejected' || item.status === 'failed') && (
            <form action={moveToDraft.bind(null, item.id, project)}>
              <button type="submit" className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition-colors">
                Draft로 복귀
              </button>
            </form>
          )}
          {item.status === 'approved' && (
            <form action={publishToBrevo.bind(null, item.id, project)}>
              <button type="submit" className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-700 rounded hover:bg-green-700 transition-colors">
                Brevo 발송
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Editable form or read-only view */}
      {isEditable ? (
        <form action={updateContentAction.bind(null, item.id, project)} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              제목
            </label>
            <input
              type="text"
              id="title"
              name="title"
              defaultValue={item.title || ''}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type + Pillar + Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
              <span className="text-sm text-gray-500">{item.type}</span>
            </div>
            <div>
              <label htmlFor="pillar" className="block text-sm font-medium text-gray-700 mb-1">필라</label>
              <select
                id="pillar"
                name="pillar"
                defaultValue={item.pillar || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-1">채널</label>
              <select
                id="channel"
                name="channel"
                defaultValue={item.channel || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Markdown Editor with Preview */}
          <ContentEditor
            initialContent={item.content_body || ''}
            name="content_body"
          />

          {/* SEO fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="seo_title" className="block text-sm font-medium text-gray-700 mb-1">
                SEO 제목
              </label>
              <input
                type="text"
                id="seo_title"
                name="seo_title"
                defaultValue={metadata.seo_title || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="검색 엔진에 노출될 제목"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <input
                type="text"
                id="description"
                name="description"
                defaultValue={metadata.description || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="메타 설명"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      ) : (
        /* Read-only view for approved/scheduled/published */
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900">{item.title || '(제목 없음)'}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
              <span>유형: {item.type}</span>
              {item.approved_by && <span>승인: {item.approved_by}</span>}
              {item.scheduled_at && (
                <span>예약: {new Date(item.scheduled_at).toLocaleString('ko-KR')}</span>
              )}
              <span>생성: {new Date(item.created_at).toLocaleString('ko-KR')}</span>
            </div>
          </div>

          {item.content_body && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <ContentEditor
                initialContent={item.content_body}
                name="content_body_readonly"
                readOnly
              />
            </div>
          )}

          {/* Metadata display */}
          {(metadata.seo_title || metadata.description) && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700">SEO 메타데이터</h3>
              {metadata.seo_title && (
                <p className="text-sm text-gray-500">SEO 제목: {metadata.seo_title}</p>
              )}
              {metadata.description && (
                <p className="text-sm text-gray-500">설명: {metadata.description}</p>
              )}
            </div>
          )}

          {item.rejected_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">반려 사유: {item.rejected_reason}</p>
            </div>
          )}
        </div>
      )}

      {/* Platform targets display */}
      {item.platform_targets && item.platform_targets !== '[]' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">배포 플랫폼</h3>
          <pre className="text-xs text-gray-500 overflow-auto bg-gray-50 rounded p-2">
            {JSON.stringify(JSON.parse(item.platform_targets), null, 2)}
          </pre>
        </div>
      )}

      {/* Publish results display */}
      {item.publish_results && item.publish_results !== '{}' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">배포 결과</h3>
          <pre className="text-xs text-gray-500 overflow-auto bg-gray-50 rounded p-2">
            {JSON.stringify(JSON.parse(item.publish_results), null, 2)}
          </pre>
        </div>
      )}

      {/* Publish logs */}
      {publishLogs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">배포 이력</h3>
          {publishLogs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-mono text-gray-500">{log.platform_id}</span>
              <span className={`px-2 py-0.5 rounded font-medium ${
                log.status === 'success' ? 'bg-green-100 text-green-700' :
                log.status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{log.status}</span>
              {log.published_url && (
                <a href={log.published_url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate max-w-xs">
                  {log.published_url}
                </a>
              )}
              {log.error_message && (
                <span className="text-red-500 truncate max-w-xs">{log.error_message}</span>
              )}
              <span className="text-gray-400">{new Date(log.created_at).toLocaleString('ko-KR')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
