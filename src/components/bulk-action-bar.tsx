'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { bulkUpdateStatus } from '@/app/actions/content';

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

interface ContentItem {
  id: string;
  type: string;
  pillar: string | null;
  topic: string | null;
  title: string | null;
  content_body: string | null;
  status: string;
  channel: string | null;
  scheduled_at: number | null;
  approved_by: string | null;
  rejected_reason: string | null;
  created_at: number;
}

export function BulkActionBar({
  items,
  projectId,
}: {
  items: ContentItem[];
  projectId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  const allSelected = selected.size === items.length && items.length > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleBulk = (newStatus: string, label: string) => {
    if (selected.size === 0) return;
    startTransition(async () => {
      const res = await bulkUpdateStatus([...selected], newStatus, projectId);
      setResult(
        `${label} 완료: ${res.success}건 성공${res.failed > 0 ? `, ${res.failed}건 실패` : ''}`
      );
      setSelected(new Set());
      setTimeout(() => setResult(null), 3000);
    });
  };

  return (
    <div>
      {/* Bulk action bar - visible when 1+ items selected */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl mb-3">
          <span className="text-sm font-medium text-blue-700">
            {selected.size}개 선택됨
          </span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <button
              onClick={() => handleBulk('review', '검수요청')}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 disabled:opacity-50"
            >
              일괄 검수요청
            </button>
            <button
              onClick={() => handleBulk('approved', '승인')}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 disabled:opacity-50"
            >
              일괄 승인
            </button>
            <button
              onClick={() => handleBulk('rejected', '반려')}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              일괄 반려
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* Result notification */}
      {result && (
        <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 mb-3">
          {result}
        </div>
      )}

      {/* Select all checkbox */}
      <div className="flex items-center gap-2 px-1 pb-2">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
          aria-label="전체 선택"
        />
        <span className="text-xs text-gray-500">전체 선택 ({items.length})</span>
      </div>

      {/* Content list with checkboxes */}
      {items.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          해당 조건의 콘텐츠가 없습니다
        </div>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 items-start">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggleOne(item.id)}
              className="mt-6 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer shrink-0"
            />
            <div className="flex-1 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
              <Link
                href={`/${projectId}/content/${item.id}`}
                className="block p-5"
              >
                {/* Badge row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
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
                      {new Date(item.scheduled_at).toLocaleDateString('ko-KR')}{' '}
                      예약
                    </span>
                  )}
                  {item.approved_by && <span>승인됨</span>}
                  {item.rejected_reason && (
                    <span className="text-red-400">반려됨</span>
                  )}
                  <span>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
