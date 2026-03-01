'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ContentEditor({
  initialContent,
  name,
  readOnly,
}: {
  initialContent: string;
  name: string;
  readOnly?: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">본문 (Markdown)</span>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          {showPreview ? '편집만' : '미리보기'}
        </button>
      </div>
      <div className={`grid gap-4 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {!readOnly && (
          <div>
            <textarea
              name={name}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="마크다운으로 콘텐츠를 작성하세요..."
            />
          </div>
        )}
        {showPreview && (
          <div className={`bg-white border border-gray-200 rounded-lg p-4 overflow-auto max-h-[520px] ${readOnly ? 'col-span-full' : ''}`}>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || '*미리보기할 내용이 없습니다*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
